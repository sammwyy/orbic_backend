import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { CoursesService } from "../courses/courses.service";
import { LevelsService } from "../levels/levels.service";
import { QuestionType, QuestionUnion } from "../levels/schemas/question.schema";
import { ProgressService } from "../progress/progress.service";
import { StatsService } from "../stats/stats.service";
import { LevelCompletionDto } from "./dto/level-completion.dto";
import { QuestionResultDto } from "./dto/question-result.dto";
import { StartGameSessionInput } from "./dto/start-game-session.input";
import { SubmitAnswerInput } from "./dto/submit-answer.input";
import {
  GameSession,
  GameSessionDocument,
  GameSessionStatus,
} from "./schemas/game-session.schema";

@Injectable()
export class GameService {
  private readonly MAX_SESSION_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds

  constructor(
    @InjectModel(GameSession.name)
    private gameSessionModel: Model<GameSessionDocument>,
    private configService: ConfigService,
    private coursesService: CoursesService,
    private levelsService: LevelsService,
    private progressService: ProgressService,
    private statsService: StatsService
  ) {}

  async startGameSession(
    input: StartGameSessionInput,
    userId: string
  ): Promise<GameSession> {
    const level = await this.levelsService.findById(input.levelId, userId);

    if (!level.questions || level.questions.length === 0) {
      throw new BadRequestException("Level has no questions");
    }

    // Check if there's an active session for this level
    const existingSession = await this.gameSessionModel.findOne({
      userId,
      levelId: level._id.toString(),
      status: GameSessionStatus.ACTIVE,
    });

    if (existingSession) {
      const now = new Date();
      const sessionDuration =
        now.getTime() - existingSession.startTime.getTime();

      if (sessionDuration > this.MAX_SESSION_DURATION) {
        await this.gameSessionModel.findByIdAndUpdate(existingSession._id, {
          $set: {
            status: GameSessionStatus.EXPIRED,
            endTime: now,
          },
        });
      } else {
        return existingSession;
      }
    }

    const gameSession = new this.gameSessionModel({
      userId,
      levelId: level._id.toString(),
      courseId: level.courseId,
      chapterId: level.chapterId,
      lives: 3,
      currentQuestionIndex: 0,
      answeredQuestions: [],
      startTime: new Date(),
      status: GameSessionStatus.ACTIVE,
      stars: 0,
      score: 0,
      maxScore: level.questions.length * 100, // 100 points per question
    });

    return gameSession.save();
  }

  async getCurrentGameSession(userId: string): Promise<GameSession | null> {
    return this.gameSessionModel
      .findOne({
        userId,
        status: GameSessionStatus.ACTIVE,
      })
      .sort({ startTime: -1 })
      .exec();
  }

  async submitAnswer(
    input: SubmitAnswerInput,
    userId: string
  ): Promise<QuestionResultDto> {
    const session = await this.gameSessionModel.findOne({
      _id: input.sessionId,
      userId,
    });

    if (!session) {
      throw new NotFoundException("Game session not found");
    }

    if (session.status !== GameSessionStatus.ACTIVE) {
      throw new BadRequestException("Game session is not active");
    }

    if (input.questionIndex !== session.currentQuestionIndex) {
      throw new BadRequestException("Invalid question index");
    }

    const level = await this.levelsService.findById(session.levelId, userId);

    if (input.questionIndex >= level.questions.length) {
      throw new BadRequestException("Question index out of bounds");
    }

    const question = level.questions[input.questionIndex];

    // Check session expiration
    const now = new Date();
    const sessionDuration = now.getTime() - session.startTime.getTime();

    if (sessionDuration > this.MAX_SESSION_DURATION) {
      await this.gameSessionModel.findByIdAndUpdate(session._id, {
        $set: {
          status: GameSessionStatus.EXPIRED,
          endTime: now,
        },
      });
      throw new BadRequestException("Game session has expired");
    }

    const isCorrect = this.evaluateAnswer(question, input);
    const livesRemaining = isCorrect
      ? session.lives
      : Math.max(0, session.lives - 1);

    const answeredQuestion = {
      questionIndex: input.questionIndex,
      isCorrect,
      userAnswer: this.getUserAnswer(input),
      timeSpent: input.timeSpent,
    };

    const isLastQuestion = input.questionIndex === level.questions.length - 1;
    const nextQuestionIndex = isLastQuestion ? null : input.questionIndex + 1;
    const isCompleted = isLastQuestion || livesRemaining === 0;

    // Calculate score
    const questionScore = isCorrect ? 100 : 0;
    const newScore = session.score + questionScore;

    const updateData: any = {
      lives: livesRemaining,
      score: newScore,
      $push: { answeredQuestions: answeredQuestion },
    };

    if (isCompleted) {
      const stars = this.calculateStars(livesRemaining);
      updateData.status = GameSessionStatus.COMPLETED;
      updateData.endTime = now;
      updateData.stars = stars;
      updateData.currentQuestionIndex = level.questions.length;
    } else {
      updateData.currentQuestionIndex = nextQuestionIndex;
    }

    await this.gameSessionModel.findByIdAndUpdate(session._id, updateData);

    if (isCompleted) {
      await this.updateProgressAndStats(session._id.toString(), userId);
    }

    const correctAnswer = this.getCorrectAnswer(question);

    return {
      isCorrect,
      livesRemaining,
      correctAnswer,
      isLastQuestion,
      nextQuestionIndex:
        nextQuestionIndex !== null ? nextQuestionIndex : undefined,
    };
  }

  async skipQuestion(
    sessionId: string,
    userId: string
  ): Promise<QuestionResultDto> {
    const session = await this.gameSessionModel.findOne({
      _id: sessionId,
      userId,
    });

    if (!session) {
      throw new NotFoundException("Game session not found");
    }

    if (session.status !== GameSessionStatus.ACTIVE) {
      throw new BadRequestException("Game session is not active");
    }

    const level = await this.levelsService.findById(session.levelId, userId);
    const questionIndex = session.currentQuestionIndex;

    if (questionIndex >= level.questions.length) {
      throw new BadRequestException("Question index out of bounds");
    }

    const question = level.questions[questionIndex];
    const livesRemaining = Math.max(0, session.lives - 1);

    const answeredQuestion = {
      questionIndex,
      isCorrect: false,
      userAnswer: "skipped",
      timeSpent: 0,
    };

    const isLastQuestion = questionIndex === level.questions.length - 1;
    const nextQuestionIndex = isLastQuestion ? null : questionIndex + 1;
    const isCompleted = isLastQuestion || livesRemaining === 0;

    const updateData: any = {
      lives: livesRemaining,
      $push: { answeredQuestions: answeredQuestion },
    };

    if (isCompleted) {
      const stars = this.calculateStars(livesRemaining);
      updateData.status = GameSessionStatus.COMPLETED;
      updateData.endTime = new Date();
      updateData.stars = stars;
      updateData.currentQuestionIndex = level.questions.length;
    } else {
      updateData.currentQuestionIndex = nextQuestionIndex;
    }

    await this.gameSessionModel.findByIdAndUpdate(session._id, updateData);

    if (isCompleted) {
      await this.updateProgressAndStats(session._id.toString(), userId);
    }

    const correctAnswer = this.getCorrectAnswer(question);

    return {
      isCorrect: false,
      livesRemaining,
      correctAnswer,
      isLastQuestion,
      nextQuestionIndex:
        nextQuestionIndex !== null ? nextQuestionIndex : undefined,
    };
  }

  async abandonSession(sessionId: string, userId: string): Promise<boolean> {
    const session = await this.gameSessionModel.findOne({
      _id: sessionId,
      userId,
    });

    if (!session) {
      throw new NotFoundException("Game session not found");
    }

    if (session.status !== GameSessionStatus.ACTIVE) {
      return true;
    }

    await this.gameSessionModel.findByIdAndUpdate(session._id, {
      $set: {
        status: GameSessionStatus.ABANDONED,
        endTime: new Date(),
      },
    });

    return true;
  }

  async getCompletedSession(
    sessionId: string,
    userId: string
  ): Promise<LevelCompletionDto> {
    const session = await this.gameSessionModel.findOne({
      _id: sessionId,
      userId,
      status: GameSessionStatus.COMPLETED,
    });

    if (!session) {
      throw new NotFoundException("Completed game session not found");
    }

    const level = await this.levelsService.findById(session.levelId, userId);

    // Get next level in the same chapter
    const levels = await this.levelsService.findChapterLevels(
      level.chapterId,
      userId
    );

    levels.sort((a, b) => a.order - b.order);

    const currentLevelIndex = levels.findIndex(
      (l) => l._id.toString() === level._id.toString()
    );

    let nextLevelId = undefined;
    let isChapterCompleted = false;

    if (currentLevelIndex < levels.length - 1) {
      nextLevelId = levels[currentLevelIndex + 1]._id.toString();
    } else {
      isChapterCompleted = true;
    }

    // Check if course is completed
    const courseProgress = await this.progressService.getCourseProgressDto(
      level.courseId,
      userId
    );
    const isCourseCompleted = courseProgress.isCompleted;

    // Check if this is a new high score
    const previousSessions = await this.gameSessionModel
      .find({
        userId,
        levelId: level._id.toString(),
        status: GameSessionStatus.COMPLETED,
        _id: { $ne: session._id },
      })
      .sort({ score: -1 })
      .limit(1)
      .exec();

    const isNewHighScore =
      previousSessions.length === 0 ||
      session.score > previousSessions[0].score;

    const correctAnswers = session.answeredQuestions.filter(
      (aq) => aq.isCorrect
    ).length;

    const timeSpent = session.endTime
      ? Math.round(
          (session.endTime.getTime() - session.startTime.getTime()) / 1000
        )
      : 0;

    return {
      levelId: level._id.toString(),
      courseId: level.courseId,
      chapterId: level.chapterId,
      score: session.score,
      maxScore: session.maxScore,
      stars: session.stars,
      correctAnswers,
      totalQuestions: level.questions.length,
      timeSpent,
      isNewHighScore,
      nextLevelId,
      isChapterCompleted,
      isCourseCompleted,
    };
  }

  private async updateProgressAndStats(
    sessionId: string,
    userId: string
  ): Promise<void> {
    const session = await this.gameSessionModel.findById(sessionId);
    if (!session || session.userId !== userId) {
      throw new ForbiddenException("Access denied to this session");
    }

    const timeSpent = session.endTime
      ? Math.round(
          (session.endTime.getTime() - session.startTime.getTime()) / 1000
        )
      : 0;

    const livesLost = 3 - session.lives;

    // Update progress
    const { isCourseCompleted } = await this.progressService.updateLevelProgress(
      session.courseId,
      userId,
      session.levelId,
      {
        score: session.score,
        stars: session.stars,
        timeSpent,
      }
    );

    // Update stats
    await this.statsService.updateUserStats(
      userId,
      session.courseId,
      session.levelId,
      {
        score: session.score,
        stars: session.stars,
        timeSpent,
        livesLost,
        isCourseCompleted,
      }
    );
  }

  private evaluateAnswer(question: any, input: SubmitAnswerInput): boolean {
    switch (question.type) {
      case QuestionType.TRUE_FALSE:
        return question.correctAnswer === input.booleanAnswer;

      case QuestionType.MULTIPLE_CHOICE:
        if (
          input.selectedOptionIndex === undefined ||
          input.selectedOptionIndex < 0 ||
          input.selectedOptionIndex >= question.options.length
        ) {
          return false;
        }
        return question.options[input.selectedOptionIndex].isCorrect;

      case QuestionType.PAIRS:
        if (
          !input.pairMatches ||
          input.pairMatches.length !== question.pairs.length
        ) {
          return false;
        }
        return input.pairMatches.every((match) => {
          const [leftIndex, rightIndex] = match.split(":").map(Number);
          if (
            isNaN(leftIndex) ||
            isNaN(rightIndex) ||
            leftIndex < 0 ||
            leftIndex >= question.pairs.length ||
            rightIndex < 0 ||
            rightIndex >= question.pairs.length
          ) {
            return false;
          }
          return (
            question.pairs[leftIndex].right === question.pairs[rightIndex].right
          );
        });

      case QuestionType.SEQUENCE:
        if (
          !input.sequenceOrder ||
          input.sequenceOrder.length !== question.correctSequence.length
        ) {
          return false;
        }
        return input.sequenceOrder.every(
          (item, index) => item === question.correctSequence[index]
        );

      case QuestionType.FREE_CHOICE:
        if (!input.freeAnswer) {
          return false;
        }
        const normalizedAnswer = input.freeAnswer.trim().toLowerCase();
        return question.acceptedAnswers.some(
          (answer) => answer.trim().toLowerCase() === normalizedAnswer
        );

      default:
        return false;
    }
  }

  private getUserAnswer(input: SubmitAnswerInput): any {
    if (input.booleanAnswer !== undefined) {
      return input.booleanAnswer;
    }
    if (input.selectedOptionIndex !== undefined) {
      return input.selectedOptionIndex;
    }
    if (input.pairMatches) {
      return input.pairMatches;
    }
    if (input.sequenceOrder) {
      return input.sequenceOrder;
    }
    if (input.freeAnswer) {
      return input.freeAnswer;
    }
    return null;
  }

  private getCorrectAnswer(question: QuestionUnion): any {
    switch (question.type) {
      case QuestionType.TRUE_FALSE:
        return [question.correctAnswer ? "true" : "false"];

      case QuestionType.MULTIPLE_CHOICE:
        return question.options
          .filter((option) => option.isCorrect)
          .map((o) => o.text);

      case QuestionType.PAIRS:
        return question.pairs.map((pair) => `${pair.left}:${pair.right}`);

      case QuestionType.SEQUENCE:
        return question.correctSequence;

      case QuestionType.FREE_CHOICE:
        return question.acceptedAnswers[0];

      default:
        return null;
    }
  }

  private calculateStars(livesRemaining: number): number {
    if (livesRemaining === 3) return 3;
    if (livesRemaining === 2) return 2;
    return 1;
  }

  async cleanupExpiredSessions(): Promise<void> {
    const expirationTime = new Date(Date.now() - this.MAX_SESSION_DURATION);

    await this.gameSessionModel.updateMany(
      {
        status: GameSessionStatus.ACTIVE,
        startTime: { $lt: expirationTime },
      },
      {
        $set: {
          status: GameSessionStatus.EXPIRED,
          endTime: new Date(),
        },
      }
    );
  }
}