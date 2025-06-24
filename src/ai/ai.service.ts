import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Cron } from "@nestjs/schedule";
import { Model } from "mongoose";
import { v4 as uuidv4 } from "uuid";

import { validateQuestions } from "@/common/utils/question.utils";
import { ChaptersService } from "../chapters/chapters.service";
import { CreateChapterInput } from "../chapters/dto/create-chapter.input";
import { CoursesService } from "../courses/courses.service";
import { CreateCourseInput } from "../courses/dto/create-course.input";
import { CourseCategory } from "../courses/schemas/course.schema";
import { CreateLevelInput } from "../levels/dto/create-level.input";
import { LevelsService } from "../levels/levels.service";
import { QuestionType } from "../levels/schemas/question.schema";
import { StorageService } from "../storage/storage.service";
import { GoogleAIClient } from "./clients/google.ai-client";
import { generateCoursePrompt, OCR_PROMPT } from "./constants/ai-prompts";
import { COURSE_STRUCTURE_SCHEMA } from "./constants/prompt-schema";
import { CourseGenerationStatus } from "./dto/course-generation-status.dto";
import { GenerateCourseFromFileInput } from "./dto/generate-course-from-file.input";
import { GenerateCourseFromTextInput } from "./dto/generate-course-from-text.input";
import { GeneratedCoursePreview } from "./dto/generated-course-preview.dto";
import {
  GenerationJob,
  GenerationJobDocument,
  GenerationJobStatus,
} from "./schemas/generation-job.schema";

interface CourseStructure {
  title: string;
  description: string;
  category: string;
  lang: string;
  chapters: Array<{
    title: string;
    description: string;
    levels: Array<{
      title: string;
      description: string;
      questions: Array<{
        type: QuestionType;
        question: string;
        correctAnswer?: boolean;
        options?: Array<{ text: string; isCorrect: boolean }>;
        pairs?: Array<{ left: string; right: string }>;
        correctSequence?: string[];
        acceptedAnswers?: string[];
      }>;
    }>;
  }>;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly googleAIClient: GoogleAIClient;

  constructor(
    @InjectModel(GenerationJob.name)
    private generationJobModel: Model<GenerationJobDocument>,
    private configService: ConfigService,
    private storageService: StorageService,
    private coursesService: CoursesService,
    private chaptersService: ChaptersService,
    private levelsService: LevelsService
  ) {
    const apiKey = this.configService.get<string>("GOOGLE_AI_API_KEY");
    if (!apiKey) {
      this.logger.error("GOOGLE_AI_API_KEY is not set");
      throw new Error("GOOGLE_AI_API_KEY is required");
    }

    this.googleAIClient = new GoogleAIClient(apiKey);
  }

  async generateCourseFromFile(
    input: GenerateCourseFromFileInput,
    userId: string
  ): Promise<string> {
    const { fileId, title, description, category, lang } = input;

    // Verify file exists and belongs to user
    await this.storageService.getFileById(fileId, userId);

    // Create a new generation job
    const jobId = uuidv4();
    const job = new this.generationJobModel({
      _id: jobId,
      userId,
      fileId,
      title: title || "<generate>",
      description: description || "<generate>",
      category: category || "<generate>",
      lang: lang || "<auto-detect>",
      status: GenerationJobStatus.PENDING,
      progress: 0,
      createdAt: new Date(),
    });

    await job.save();

    // Start processing in background
    this.processFileGenerationJob(job).catch((error) => {
      this.logger.error(`Error processing job ${jobId}:`, error);
      this.updateJobStatus(jobId, GenerationJobStatus.FAILED, error.message);
    });

    return jobId;
  }

  async generateCourseFromText(
    input: GenerateCourseFromTextInput,
    userId: string
  ): Promise<string> {
    const { content, title, description, category, lang } = input;

    if (!content || content.trim().length < 100) {
      throw new BadRequestException(
        "Content must be at least 100 characters long"
      );
    }

    // Create a new generation job
    const jobId = uuidv4();
    const job = new this.generationJobModel({
      _id: jobId,
      userId,
      content,
      title: title || "<generate>",
      description: description || "<generate>",
      category: category || "<generate>",
      lang: lang || "<auto-detect>",
      status: GenerationJobStatus.PENDING,
      progress: 0,
      createdAt: new Date(),
    });

    await job.save();

    // Start processing in background
    this.processTextGenerationJob(job).catch((error) => {
      this.logger.error(`Error processing job ${jobId}:`, error);
      this.updateJobStatus(jobId, GenerationJobStatus.FAILED, error.message);
    });

    return jobId;
  }

  async getCourseGenerationStatus(
    jobId: string,
    userId: string
  ): Promise<CourseGenerationStatus> {
    const job = await this.generationJobModel
      .findOne({ _id: jobId, userId })
      .exec();

    if (!job) {
      throw new NotFoundException(`Generation job with ID ${jobId} not found`);
    }

    return {
      jobId: job._id,
      status: job.status,
      progress: job.progress,
      message: job.message,
      courseId: job.courseId,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      error: job.error,
    };
  }

  async previewGeneratedCourse(
    jobId: string,
    userId: string
  ): Promise<GeneratedCoursePreview> {
    const job = await this.generationJobModel
      .findOne({ _id: jobId, userId })
      .exec();

    if (!job) {
      throw new NotFoundException(`Generation job with ID ${jobId} not found`);
    }

    if (job.status !== GenerationJobStatus.COMPLETED) {
      throw new BadRequestException("Course generation is not completed yet");
    }

    if (!job.courseId) {
      throw new BadRequestException("Course ID is not available");
    }

    const course = await this.coursesService.findById(job.courseId, userId);
    const chapters = await this.chaptersService.findCourseChapters(
      job.courseId,
      userId
    );

    // Get first level of first chapter as a sample
    let sampleLevel = null;
    if (chapters.length > 0) {
      const levels = await this.levelsService.findChapterLevels(
        chapters[0]._id.toString(),
        userId
      );
      if (levels.length > 0) {
        sampleLevel = levels[0];
      }
    }

    return {
      course,
      chapterCount: chapters.length,
      sampleChapters: chapters.slice(0, 3),
      sampleLevel,
    };
  }

  private async updateJobStatus(
    jobId: string,
    status: GenerationJobStatus,
    message?: string,
    progress?: number,
    courseId?: string,
    error?: string
  ): Promise<void> {
    const update: any = { status, message };

    if (progress !== undefined) {
      update.progress = progress;
    }

    if (courseId) {
      update.courseId = courseId;
    }

    if (error) {
      update.error = error;
    }

    if (
      status === GenerationJobStatus.COMPLETED ||
      status === GenerationJobStatus.FAILED
    ) {
      update.completedAt = new Date();
    }

    await this.generationJobModel
      .findByIdAndUpdate(jobId, { $set: update })
      .exec();
  }

  private async processFileGenerationJob(
    job: GenerationJobDocument
  ): Promise<void> {
    try {
      await this.updateJobStatus(
        job._id,
        GenerationJobStatus.PROCESSING,
        "Extracting content from file"
      );

      // Extract content based on file type
      let content = "";
      const file = await this.storageService.getFileById(
        job.fileId,
        job.userId
      );

      if (file.mimetype === "application/pdf") {
        content = await this.storageService.readFileAsPDF(file._id);
      } else if (file.mimetype.startsWith("image/")) {
        // For images, we'll use AI to extract text (OCR)
        const base64Image = await this.storageService.readFileAsBase64Buffer(
          file._id
        );
        content = await this.extractTextFromImage(base64Image, file.mimetype);
      } else if (file.mimetype === "text/plain") {
        content = await this.storageService.readFileAsPlainText(file._id);
      } else {
        throw new BadRequestException(
          `Unsupported file type: ${file.mimetype}`
        );
      }

      if (!content || content.trim().length < 50) {
        throw new BadRequestException(
          "Could not extract sufficient content from file"
        );
      }

      // Update job with extracted content
      await this.generationJobModel
        .findByIdAndUpdate(job._id, {
          $set: { content, progress: 20 },
        })
        .exec();

      // Continue with text-based generation
      const updatedJob = await this.generationJobModel.findById(job._id).exec();
      await this.processTextGenerationJob(updatedJob);
    } catch (error) {
      this.logger.error(
        `Error processing file generation job ${job._id}:`,
        error
      );
      await this.updateJobStatus(
        job._id,
        GenerationJobStatus.FAILED,
        "Failed to process file",
        0,
        undefined,
        error.message
      );
    }
  }

  private async processTextGenerationJob(
    job: GenerationJobDocument
  ): Promise<void> {
    try {
      await this.updateJobStatus(
        job._id,
        GenerationJobStatus.PROCESSING,
        "Analyzing content",
        30
      );

      // 1. Analyze content and generate course structure
      const courseStructure = await this.generateCourseStructure(
        job.content,
        job.title,
        job.description,
        job.category,
        job.lang
      );

      await this.updateJobStatus(
        job._id,
        GenerationJobStatus.PROCESSING,
        "Creating course",
        50
      );

      // 2. Create the course
      const courseInput: CreateCourseInput = {
        title: courseStructure.title,
        description: courseStructure.description,
        category: courseStructure.category as CourseCategory,
        lang: job.lang,
      };

      const course = await this.coursesService.create(courseInput, job.userId);
      await this.updateJobStatus(
        job._id,
        GenerationJobStatus.PROCESSING,
        "Creating chapters and levels",
        60,
        course._id.toString()
      );

      // 3. Create chapters and levels
      for (let i = 0; i < courseStructure.chapters.length; i++) {
        const chapterData = courseStructure.chapters[i];

        // Create chapter
        const chapterInput: CreateChapterInput = {
          title: chapterData.title,
          description: chapterData.description,
          courseId: course._id.toString(),
          order: i + 1,
        };

        const chapter = await this.chaptersService.create(
          chapterInput,
          job.userId
        );

        // Create levels for this chapter
        for (let j = 0; j < chapterData.levels.length; j++) {
          const levelData = chapterData.levels[j];

          const levelInput: CreateLevelInput = {
            title: levelData.title,
            description: levelData.description,
            chapterId: chapter._id.toString(),
            courseId: course._id.toString(),
            order: j + 1,
            questions: levelData.questions,
          };

          await this.levelsService.create(levelInput, job.userId);
        }

        // Update progress
        const progress =
          60 + Math.floor(((i + 1) / courseStructure.chapters.length) * 40);
        await this.updateJobStatus(
          job._id,
          GenerationJobStatus.PROCESSING,
          `Created chapter ${i + 1} of ${courseStructure.chapters.length}`,
          progress,
          course._id.toString()
        );
      }

      // 4. Mark job as completed
      await this.updateJobStatus(
        job._id,
        GenerationJobStatus.COMPLETED,
        "Course generation completed",
        100,
        course._id.toString()
      );
    } catch (error) {
      this.logger.error(
        `Error processing text generation job ${job._id}:`,
        error
      );
      await this.updateJobStatus(
        job._id,
        GenerationJobStatus.FAILED,
        "Failed to generate course",
        0,
        undefined,
        error.message
      );
    }
  }

  private async extractTextFromImage(
    base64Image: string,
    mimeType: string
  ): Promise<string> {
    try {
      return await this.googleAIClient.analyzeImage(
        base64Image,
        "",
        mimeType,
        OCR_PROMPT
      );
    } catch (error) {
      this.logger.error("Error extracting text from image:", error);
      throw new Error("Failed to extract text from image");
    }
  }

  private async generateCourseStructure(
    content: string,
    title?: string,
    description?: string,
    category?: string,
    lang?: string
  ): Promise<CourseStructure> {
    try {
      const systemPrompt = generateCoursePrompt({
        title,
        description,
        category,
        lang,
      });

      const courseStructure =
        await this.googleAIClient.generateJson<CourseStructure>(
          content,
          COURSE_STRUCTURE_SCHEMA,
          systemPrompt,
          ["title", "description", "category", "lang", "chapters"]
        );

      // Validate the structure
      this.validateCourseStructure(courseStructure);

      return courseStructure;
    } catch (error) {
      this.logger.error("Error generating course structure:", error);
      throw new Error("Failed to generate course structure: " + error.message);
    }
  }

  private validateCourseStructure(structure: CourseStructure): void {
    if (
      !structure.title ||
      !structure.description ||
      !structure.chapters ||
      !Array.isArray(structure.chapters)
    ) {
      throw new Error("Invalid course structure: missing required fields");
    }

    if (structure.chapters.length === 0) {
      throw new Error("Invalid course structure: no chapters generated");
    }

    for (const chapter of structure.chapters) {
      if (
        !chapter.title ||
        !chapter.description ||
        !chapter.levels ||
        !Array.isArray(chapter.levels)
      ) {
        throw new Error("Invalid chapter structure: missing required fields");
      }

      if (chapter.levels.length === 0) {
        throw new Error("Invalid chapter structure: no levels generated");
      }

      for (const level of chapter.levels) {
        if (
          !level.title ||
          !level.description ||
          !level.questions ||
          !Array.isArray(level.questions)
        ) {
          throw new Error("Invalid level structure: missing required fields");
        }

        if (level.questions.length === 0) {
          throw new Error("Invalid level structure: no questions generated");
        }

        validateQuestions(level.questions);
      }
    }
  }

  /**
  private validateQuestion(question: any): void {
    if (!question.type || !question.question) {
      throw new Error("Invalid question structure: missing required fields");
    }

    if (!Object.values(QuestionType).includes(question.type as QuestionType)) {
      throw new Error(`Invalid question type: ${question.type}`);
    }

    // Type-specific validations
    switch (question.type) {
      case QuestionType.TRUE_FALSE:
        if (typeof question.correctAnswer !== "boolean") {
          throw new Error(
            "True/False question must have a boolean correctAnswer"
          );
        }
        break;

      case QuestionType.MULTIPLE_CHOICE:
        if (!Array.isArray(question.options) || question.options.length < 2) {
          throw new Error(
            "Multiple choice question must have at least 2 options"
          );
        }
        const correctOptions = question.options.filter(
          (opt: any) => opt.isCorrect
        );
        if (correctOptions.length === 0) {
          throw new Error(
            "Multiple choice question must have at least one correct option"
          );
        }
        break;

      case QuestionType.PAIRS:
        if (!Array.isArray(question.pairs) || question.pairs.length < 2) {
          throw new Error("Pairs question must have at least 2 pairs");
        }
        break;

      case QuestionType.SEQUENCE:
        if (
          !Array.isArray(question.correctSequence) ||
          question.correctSequence.length < 2
        ) {
          throw new Error("Sequence question must have at least 2 items");
        }
        break;

      case QuestionType.FREE_CHOICE:
        if (
          !Array.isArray(question.acceptedAnswers) ||
          question.acceptedAnswers.length === 0
        ) {
          throw new Error(
            "Free choice question must have at least one accepted answer"
          );
        }
        break;
    }
  }
    */

  @Cron("0 */10 * * * *") // Run every 10 minutes
  async cleanupStaleJobs() {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    // Find processing jobs that haven't been updated in the last hour
    const staleJobs = await this.generationJobModel
      .find({
        status: GenerationJobStatus.PROCESSING,
        updatedAt: { $lt: oneHourAgo },
      })
      .exec();

    for (const job of staleJobs) {
      this.logger.warn(`Found stale job ${job._id}, marking as failed`);
      await this.updateJobStatus(
        job._id,
        GenerationJobStatus.FAILED,
        "Job timed out",
        job.progress,
        job.courseId,
        "Job processing took too long and was automatically cancelled"
      );
    }
  }
}
