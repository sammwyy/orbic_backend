import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CoursesService } from "../courses/courses.service";
import {
  CourseProgress,
  CourseProgressDocument,
} from "./schemas/course-progress.schema";

@Injectable()
export class ProgressService {
  constructor(
    @InjectModel(CourseProgress.name)
    private progressModel: Model<CourseProgressDocument>,
    private coursesService: CoursesService
  ) {}

  async getCourseProgress(
    courseId: string,
    userId: string
  ): Promise<CourseProgressDocument | null> {
    // Verify access to course
    await this.coursesService.findById(courseId, userId);

    return this.progressModel.findOne({ courseId, userId }).exec();
  }

  async initializeCourseProgress(
    courseId: string,
    userId: string
  ): Promise<CourseProgressDocument> {
    // Verify access to course
    await this.coursesService.findById(courseId, userId);

    // Check if progress already exists
    const existingProgress = await this.progressModel
      .findOne({ courseId, userId })
      .exec();
    if (existingProgress) {
      return existingProgress;
    }

    const progress = new this.progressModel({
      courseId,
      userId,
      currentChapter: 0,
      currentLevel: 0,
      levelProgress: [],
      totalScore: 0,
      totalMaxScore: 0,
      completed: false,
    });

    return progress.save();
  }

  async updateLevelProgress(
    courseId: string,
    userId: string,
    levelId: string,
    score: number,
    maxScore: number
  ): Promise<CourseProgress> {
    let progress = await this.getCourseProgress(courseId, userId);

    if (!progress) {
      progress = await this.initializeCourseProgress(courseId, userId);
    }

    // Find existing level progress or create new one
    const existingLevelIndex = progress.levelProgress.findIndex(
      (lp) => lp.levelId === levelId
    );

    if (existingLevelIndex >= 0) {
      // Update existing progress
      progress.levelProgress[existingLevelIndex].score = Math.max(
        progress.levelProgress[existingLevelIndex].score,
        score
      );
      progress.levelProgress[existingLevelIndex].attempts += 1;
      progress.levelProgress[existingLevelIndex].completed = score > 0;
      progress.levelProgress[existingLevelIndex].completedAt = new Date();
    } else {
      // Add new level progress
      progress.levelProgress.push({
        levelId,
        completed: score > 0,
        score,
        maxScore,
        attempts: 1,
        completedAt: score > 0 ? new Date() : undefined,
      });
    }

    // Recalculate total scores
    progress.totalScore = progress.levelProgress.reduce(
      (sum, lp) => sum + lp.score,
      0
    );
    progress.totalMaxScore = progress.levelProgress.reduce(
      (sum, lp) => sum + lp.maxScore,
      0
    );

    return progress.save();
  }

  async getUserPlayingCourses(userId: string): Promise<CourseProgress[]> {
    return this.progressModel
      .find({ userId, completed: false })
      .sort({ updatedAt: -1 })
      .exec();
  }

  async getUserCompletedCourses(userId: string): Promise<CourseProgress[]> {
    return this.progressModel
      .find({ userId, completed: true })
      .sort({ updatedAt: -1 })
      .exec();
  }
}
