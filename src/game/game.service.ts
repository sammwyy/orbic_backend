import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { ChaptersService } from "../chapters/chapters.service";
import { CoursesService } from "../courses/courses.service";
import { LevelsService } from "../levels/levels.service";
import { QuestionType, QuestionUnion } from "../levels/schemas/question.schema";
import { ProgressService } from "../progress/progress.service";
import { CourseProgressDto } from "./dto/course-progress.dto";
import { LevelCompletionDto } from "./dto/level-completion.dto";
import { LevelProgressDto } from "./dto/level-progress.dto";
import { QuestionResultDto } from "./dto/question-result.dto";
import { StartGameSessionInput } from "./dto/start-game-session.input";
import { SubmitAnswerInput } from "./dto/submit-answer.input";
import { UserStatsDto } from "./dto/user-stats.dto";
import {
  GameSession,
  GameSessionDocument,
  GameSessionStatus,
} from "./schemas/game-session.schema";
import { UserStats, UserStatsDocument } from "./schemas/user-stats.schema";

@Injectable()
export class GameService {
  private readonly MAX_SESSION_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds

  constructor(
    @InjectModel(GameSession.name)
    private gameSessionModel: Model<GameSessionDocument>,
    @InjectModel(UserStats.name)
    private userStatsModel: Model<UserStatsDocument>,
    private configService: ConfigService,
    private coursesService: CoursesService,
    private chaptersService: ChaptersService,
    private levelsService: LevelsService,
    private progressService: ProgressService
  ) {}

  async startGameSession(
    input: StartGameSessionInput,
    userId: string
  ): Promise<GameSession> {
    // Get level details
    const level = await this.levelsService.findById(input.levelId, userId);

    // Check if level has questions
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
      // Check if session is expired
      const now = new Date();
      const sessionDuration =
        now.getTime() - existingSession.startTime.getTime();

      if (sessionDuration > this.MAX_SESSION_DURATION) {
        // Mark as expired and create a new one
        await this.gameSessionModel.findByIdAndUpdate(existingSession._id, {
          $set: {
            status: GameSessionStatus.EXPIRED,
            endTime: now,
          },
        });
      } else {
        // Return existing active session
        return existingSession;
      }
    }

    // Create a new game session
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
    });

    return gameSession.save();
  }

  async getCurrentGameSession(userId: string): Promise<GameSession | null> {
    // Find the most recent active session
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
    // Get the session
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

    // Check if the question index is valid
    if (input.questionIndex !== session.currentQuestionIndex) {
      throw new BadRequestException("Invalid question index");
    }

    // Get the level and question
    const level = await this.levelsService.findById(session.levelId, userId);

    if (input.questionIndex >= level.questions.length) {
      throw new BadRequestException("Question index out of bounds");
    }

    const question = level.questions[input.questionIndex];

    // Check if the session is expired
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

    // Evaluate the answer
    const isCorrect = this.evaluateAnswer(question, input);

    // Check if this is the last question
    const isLastQuestion = input.questionIndex === level.questions.length - 1;

    let updateData: any = {};
    let livesRemaining = session.lives;
    let nextQuestionIndex: number | null = null;

    if (isCorrect) {
      // Respuesta correcta: registrar la respuesta y avanzar a la siguiente pregunta
      const answeredQuestion = {
        questionIndex: input.questionIndex,
        isCorrect: true,
        userAnswer: this.getUserAnswer(input),
        timeSpent: input.timeSpent,
      };

      updateData.$push = { answeredQuestions: answeredQuestion };

      if (isLastQuestion) {
        // Completar el nivel
        const stars = this.calculateStars(session.lives);
        updateData.status = GameSessionStatus.COMPLETED;
        updateData.endTime = now;
        updateData.stars = stars;
        updateData.currentQuestionIndex = level.questions.length;
      } else {
        // Avanzar a la siguiente pregunta
        nextQuestionIndex = input.questionIndex + 1;
        updateData.currentQuestionIndex = nextQuestionIndex;
      }
    } else {
      // Respuesta incorrecta: perder vida pero NO registrar la respuesta ni avanzar
      livesRemaining = Math.max(0, session.lives - 1);
      updateData.lives = livesRemaining;

      // Si se quedan sin vidas, completar el nivel con las respuestas que tengan
      if (livesRemaining === 0) {
        const stars = this.calculateStars(livesRemaining);
        updateData.status = GameSessionStatus.COMPLETED;
        updateData.endTime = now;
        updateData.stars = stars;
        updateData.currentQuestionIndex = level.questions.length;
      }
      // Si aún tienen vidas, mantener la misma pregunta (no cambiar currentQuestionIndex)
    }

    // Actualizar la sesión
    await this.gameSessionModel.findByIdAndUpdate(session._id, updateData);

    // Si se completó el nivel, actualizar progreso y estadísticas
    const isCompleted = updateData.status === GameSessionStatus.COMPLETED;
    if (isCompleted) {
      await this.updateProgress(session._id.toString(), userId);
      await this.updateUserStats(session._id.toString(), userId);
    }

    // Preparar la respuesta
    const correctAnswer = this.getCorrectAnswer(question);

    return {
      isCorrect,
      livesRemaining,
      correctAnswer,
      isLastQuestion: isCompleted, // Solo es la última pregunta si se completó el nivel
      nextQuestionIndex: nextQuestionIndex !== null ? nextQuestionIndex : undefined,
    };
  }

  async skipQuestion(
    sessionId: string,
    userId: string
  ): Promise<QuestionResultDto> {
    // Get the session
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

    // Get the level and question
    const level = await this.levelsService.findById(session.levelId, userId);
    const questionIndex = session.currentQuestionIndex;

    if (questionIndex >= level.questions.length) {
      throw new BadRequestException("Question index out of bounds");
    }

    const question = level.questions[questionIndex];

    // Skipping costs a life but doesn't advance to next question
    const livesRemaining = Math.max(0, session.lives - 1);

    // Check if this is the last question
    const isLastQuestion = questionIndex === level.questions.length - 1;

    // Update session
    const updateData: any = {
      lives: livesRemaining,
    };

    // Si se quedan sin vidas o es la última pregunta, completar el nivel
    if (livesRemaining === 0 || isLastQuestion) {
      // Si es skip en la última pregunta, registrar como respuesta incorrecta
      if (isLastQuestion) {
        const answeredQuestion = {
          questionIndex,
          isCorrect: false,
          userAnswer: "skipped",
          timeSpent: 0,
        };
        updateData.$push = { answeredQuestions: answeredQuestion };
      }

      const stars = this.calculateStars(livesRemaining);
      updateData.status = GameSessionStatus.COMPLETED;
      updateData.endTime = new Date();
      updateData.stars = stars;
      updateData.currentQuestionIndex = level.questions.length;
    }
    // Si aún tienen vidas y no es la última pregunta, mantener la misma pregunta

    await this.gameSessionModel.findByIdAndUpdate(session._id, updateData);

    // Si se completó, actualizar progreso y estadísticas
    const isCompleted = updateData.status === GameSessionStatus.COMPLETED;
    if (isCompleted) {
      await this.updateProgress(session._id.toString(), userId);
      await this.updateUserStats(session._id.toString(), userId);
    }

    // Preparar la respuesta
    const correctAnswer = this.getCorrectAnswer(question);

    return {
      isCorrect: false,
      livesRemaining,
      correctAnswer,
      isLastQuestion: isCompleted,
      nextQuestionIndex: undefined, // No avanzar de pregunta al hacer skip
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
      return true; // Already completed or abandoned
    }

    await this.gameSessionModel.findByIdAndUpdate(session._id, {
      $set: {
        status: GameSessionStatus.ABANDONED,
        endTime: new Date(),
      },
    });

    return true;
  }

  async getLevelProgress(
    levelId: string,
    userId: string
  ): Promise<LevelProgressDto> {
    // Get level details
    const level = await this.levelsService.findById(levelId, userId);

    // Get all completed sessions for this level
    const sessions = await this.gameSessionModel
      .find({
        userId,
        levelId,
        status: GameSessionStatus.COMPLETED,
      })
      .sort({ endTime: -1 })
      .exec();

    // Calculate stats
    const isCompleted = sessions.length > 0;
    const bestScore = Math.max(0, ...sessions.map((s) => s.score));
    const bestStars = Math.max(0, ...sessions.map((s) => s.stars));
    const attempts = sessions.length;

    // Calculate total time spent
    const totalTimeSpent = sessions.reduce((total, session) => {
      const duration = session.endTime
        ? (session.endTime.getTime() - session.startTime.getTime()) / 1000
        : 0;
      return total + duration;
    }, 0);

    // Get recent attempts
    const recentAttempts = sessions.slice(0, 5).map((session) => ({
      sessionId: session._id.toString(),
      completedAt: session.endTime || session.updatedAt,
      score: session.score,
      stars: session.stars,
      timeSpent: session.endTime
        ? Math.round(
            (session.endTime.getTime() - session.startTime.getTime()) / 1000
          )
        : 0,
    }));

    return {
      levelId,
      isCompleted,
      bestScore,
      bestStars,
      attempts,
      totalTimeSpent: Math.round(totalTimeSpent),
      recentAttempts,
    };
  }

  async getCourseProgress(
    courseId: string,
    userId: string
  ): Promise<CourseProgressDto> {
    // Get course details
    const course = await this.coursesService.findById(courseId, userId);

    // Get all chapters for this course
    const chapters = await this.chaptersService.findCourseChapters(
      courseId,
      userId
    );

    let totalLevels = 0;
    let completedLevels = 0;
    let totalStars = 0;
    let maxPossibleStars = 0;

    // Process each chapter
    const chapterProgress = await Promise.all(
      chapters.map(async (chapter) => {
        // Get all levels for this chapter
        const levels = await this.levelsService.findChapterLevels(
          chapter._id.toString(),
          userId
        );

        // Get completed levels
        const levelIds = levels.map((level) => level._id.toString());
        const completedSessions = await this.gameSessionModel
          .find({
            userId,
            levelId: { $in: levelIds },
            status: GameSessionStatus.COMPLETED,
          })
          .exec();

        // Group by levelId and get best score/stars
        const levelCompletions = new Map();
        completedSessions.forEach((session) => {
          const existing = levelCompletions.get(session.levelId);
          if (!existing || session.stars > existing.stars) {
            levelCompletions.set(session.levelId, {
              stars: session.stars,
              score: session.score,
            });
          }
        });

        const chapterCompletedLevels = levelCompletions.size;
        const chapterTotalLevels = levels.length;
        const chapterTotalStars = Array.from(levelCompletions.values()).reduce(
          (sum, level) => sum + level.stars,
          0
        );
        const chapterMaxPossibleStars = chapterTotalLevels * 3; // 3 stars max per level

        // Update totals
        totalLevels += chapterTotalLevels;
        completedLevels += chapterCompletedLevels;
        totalStars += chapterTotalStars;
        maxPossibleStars += chapterMaxPossibleStars;

        // Determine if chapter is locked
        // First chapter is always unlocked
        // Other chapters are unlocked if previous chapter has at least one completed level
        const isLocked =
          chapter.order > 1 &&
          chapters.find((c) => c.order === chapter.order - 1)?.levelsCount >
            0 &&
          levelCompletions.size === 0;

        return {
          chapterId: chapter._id.toString(),
          title: chapter.title,
          completedLevels: chapterCompletedLevels,
          totalLevels: chapterTotalLevels,
          totalStars: chapterTotalStars,
          maxPossibleStars: chapterMaxPossibleStars,
          isCompleted:
            chapterCompletedLevels === chapterTotalLevels &&
            chapterTotalLevels > 0,
          isLocked,
        };
      })
    );

    const completedChapters = chapterProgress.filter(
      (cp) => cp.isCompleted
    ).length;

    return {
      courseId,
      completedLevels,
      totalLevels,
      totalStars,
      maxPossibleStars,
      completedChapters,
      totalChapters: chapters.length,
      isCompleted: completedLevels === totalLevels && totalLevels > 0,
      completionPercentage:
        totalLevels > 0 ? Math.round((completedLevels / totalLevels) * 100) : 0,
      chapterProgress,
    };
  }

  async getUserStats(userId: string): Promise<UserStatsDto> {
    // Get or create user stats
    let userStats: UserStatsDocument = await this.userStatsModel
      .findOne({ userId })
      .exec();

    if (!userStats) {
      userStats = await this.initializeUserStats(userId);
    }

    // Convert to DTO
    return {
      totalCoursesCompleted: userStats.totalCoursesCompleted,
      totalLevelsCompleted: userStats.totalLevelsCompleted,
      totalTimeSpent: userStats.totalTimeSpent,
      totalLivesLost: userStats.totalLivesLost,
      totalStarsEarned: userStats.totalStarsEarned,
      totalScore: userStats.totalScore,
      currentStreak: userStats.currentStreak,
      longestStreak: userStats.longestStreak,
      categoriesStats: userStats.categoryStats.map((cs) => ({
        category: cs.category,
        coursesCompleted: cs.coursesCompleted,
        levelsCompleted: cs.levelsCompleted,
        totalStars: cs.totalStars,
        totalScore: cs.totalScore,
      })),
    };
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

    // Get level details
    const level = await this.levelsService.findById(session.levelId, userId);
    const chapter = await this.chaptersService.findById(
      level.chapterId,
      userId
    );

    // Get next level in the same chapter
    const levels = await this.levelsService.findChapterLevels(
      level.chapterId,
      userId
    );

    // Sort by order
    levels.sort((a, b) => a.order - b.order);

    // Find current level index
    const currentLevelIndex = levels.findIndex(
      (l) => l._id.toString() === level._id.toString()
    );

    // Determine next level
    let nextLevelId = undefined;
    let isChapterCompleted = false;

    if (currentLevelIndex < levels.length - 1) {
      nextLevelId = levels[currentLevelIndex + 1]._id.toString();
    } else {
      isChapterCompleted = true;
    }

    // Check if course is completed
    const courseProgress = await this.getCourseProgress(level.courseId, userId);
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

    // Count correct answers
    const correctAnswers = session.answeredQuestions.filter(
      (aq) => aq.isCorrect
    ).length;

    // Calculate time spent
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
        // Each pairMatch should be in format "leftIndex:rightIndex"
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
    // 3 stars: All 3 lives remaining
    // 2 stars: 2 lives remaining
    // 1 star: 1 or 0 lives remaining but completed
    if (livesRemaining === 3) return 3;
    if (livesRemaining === 2) return 2;
    return 1;
  }

  private async updateProgress(
    sessionId: string,
    userId: string
  ): Promise<void> {
    const session = await this.gameSessionModel.findById(sessionId);
    if (!session || session.userId !== userId) {
      throw new ForbiddenException("Access denied to this session");
    }

    // Update level progress in the progress collection
    await this.progressService.updateLevelProgress(
      session.courseId,
      userId,
      session.levelId,
      session.score,
      session.maxScore
    );
  }

  private async updateUserStats(
    sessionId: string,
    userId: string
  ): Promise<void> {
    const session = await this.gameSessionModel.findById(sessionId);
    if (!session || session.userId !== userId) {
      throw new ForbiddenException("Access denied to this session");
    }

    // Get or create user stats
    let userStats: UserStatsDocument = await this.userStatsModel
      .findOne({ userId })
      .exec();

    if (!userStats) {
      userStats = await this.initializeUserStats(userId);
    }

    // Get level and course details
    const level = await this.levelsService.findById(session.levelId);
    const course = await this.coursesService.findById(session.courseId);

    // Calculate time spent
    const timeSpent = session.endTime
      ? Math.round(
          (session.endTime.getTime() - session.startTime.getTime()) / 1000
        )
      : 0;

    // Calculate lives lost
    const livesLost = 3 - session.lives;

    // Update general stats
    const updateData: any = {
      $inc: {
        totalLevelsCompleted: 1,
        totalTimeSpent: timeSpent,
        totalLivesLost: livesLost,
        totalStarsEarned: session.stars,
        totalScore: session.score,
      },
    };

    // Update category stats
    const categoryIndex = userStats.categoryStats.findIndex(
      (cs) => cs.category === course.category
    );

    if (categoryIndex >= 0) {
      updateData[`categoryStats.${categoryIndex}.levelsCompleted`] =
        userStats.categoryStats[categoryIndex].levelsCompleted + 1;
      updateData[`categoryStats.${categoryIndex}.totalStars`] =
        userStats.categoryStats[categoryIndex].totalStars + session.stars;
      updateData[`categoryStats.${categoryIndex}.totalScore`] =
        userStats.categoryStats[categoryIndex].totalScore + session.score;
    } else {
      updateData.$push = {
        categoryStats: {
          category: course.category,
          coursesCompleted: 0,
          levelsCompleted: 1,
          totalStars: session.stars,
          totalScore: session.score,
        },
      };
    }

    // Update streak
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastActivityDate = userStats.lastActivityDate;
    let lastActivityDay = null;

    if (lastActivityDate) {
      lastActivityDay = new Date(lastActivityDate);
      lastActivityDay.setHours(0, 0, 0, 0);
    }

    // Check if this is a new day
    if (!lastActivityDay || today.getTime() !== lastActivityDay.getTime()) {
      // If last activity was yesterday, increment streak
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (
        lastActivityDay &&
        lastActivityDay.getTime() === yesterday.getTime()
      ) {
        updateData.$inc.currentStreak = 1;

        // Update longest streak if needed
        if (userStats.currentStreak + 1 > userStats.longestStreak) {
          updateData.$inc.longestStreak = 1;
        }
      } else if (
        !lastActivityDay ||
        lastActivityDay.getTime() < yesterday.getTime()
      ) {
        // Reset streak for gap > 1 day
        updateData.currentStreak = 1;
      }

      // Add daily activity
      updateData.$push = updateData.$push || {};
      updateData.$push.dailyActivity = {
        date: today,
        levelsCompleted: 1,
        timeSpent,
        starsEarned: session.stars,
        score: session.score,
      };
    } else {
      // Same day, update existing daily activity
      const dailyActivityIndex = userStats.dailyActivity.findIndex((da) => {
        const daDate = new Date(da.date);
        daDate.setHours(0, 0, 0, 0);
        return daDate.getTime() === today.getTime();
      });

      if (dailyActivityIndex >= 0) {
        updateData[`dailyActivity.${dailyActivityIndex}.levelsCompleted`] =
          userStats.dailyActivity[dailyActivityIndex].levelsCompleted + 1;
        updateData[`dailyActivity.${dailyActivityIndex}.timeSpent`] =
          userStats.dailyActivity[dailyActivityIndex].timeSpent + timeSpent;
        updateData[`dailyActivity.${dailyActivityIndex}.starsEarned`] =
          userStats.dailyActivity[dailyActivityIndex].starsEarned +
          session.stars;
        updateData[`dailyActivity.${dailyActivityIndex}.score`] =
          userStats.dailyActivity[dailyActivityIndex].score + session.score;
      } else {
        // Shouldn't happen, but just in case
        updateData.$push = updateData.$push || {};
        updateData.$push.dailyActivity = {
          date: today,
          levelsCompleted: 1,
          timeSpent,
          starsEarned: session.stars,
          score: session.score,
        };
      }
    }

    // Update last activity date
    updateData.lastActivityDate = new Date();

    // Check if course is completed
    const courseProgress = await this.getCourseProgress(
      session.courseId,
      userId
    );
    if (courseProgress.isCompleted) {
      // Check if this is the first time completing the course
      const existingCompletedCourse = userStats.categoryStats.find(
        (cs) => cs.category === course.category && cs.coursesCompleted > 0
      );

      if (!existingCompletedCourse) {
        updateData.$inc.totalCoursesCompleted = 1;

        if (categoryIndex >= 0) {
          updateData[`categoryStats.${categoryIndex}.coursesCompleted`] =
            userStats.categoryStats[categoryIndex].coursesCompleted + 1;
        } else if (updateData.$push && updateData.$push.categoryStats) {
          updateData.$push.categoryStats.coursesCompleted = 1;
        }
      }
    }

    // Update user stats
    await this.userStatsModel.findByIdAndUpdate(userStats._id, updateData);
  }

  private async initializeUserStats(
    userId: string
  ): Promise<UserStatsDocument> {
    const userStats = new this.userStatsModel({
      userId,
      totalCoursesCompleted: 0,
      totalLevelsCompleted: 0,
      totalTimeSpent: 0,
      totalLivesLost: 0,
      totalStarsEarned: 0,
      totalScore: 0,
      currentStreak: 0,
      longestStreak: 0,
      categoryStats: [],
      dailyActivity: [],
      lastActivityDate: null,
    });

    return userStats.save();
  }

  // Cleanup expired sessions
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