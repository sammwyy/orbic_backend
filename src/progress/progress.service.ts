import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { ChaptersService } from "../chapters/chapters.service";
import { CoursesService } from "../courses/courses.service";
import { LevelsService } from "../levels/levels.service";
import {
  CourseProgress,
  CourseProgressDocument,
} from "./schemas/course-progress.schema";

@Injectable()
export class ProgressService {
  constructor(
    @InjectModel(CourseProgress.name)
    private progressModel: Model<CourseProgressDocument>,
    private coursesService: CoursesService,
    private chaptersService: ChaptersService,
    private levelsService: LevelsService
  ) {}

  async getCourseProgress(
    courseId: string,
    userId: string
  ): Promise<CourseProgressDocument | null> {
    await this.coursesService.findById(courseId, userId);
    return this.progressModel.findOne({ courseId, userId }).exec();
  }

  async initializeCourseProgress(
    courseId: string,
    userId: string
  ): Promise<CourseProgressDocument> {
    await this.coursesService.findById(courseId, userId);

    const existingProgress = await this.progressModel
      .findOne({ courseId, userId })
      .exec();
    if (existingProgress) {
      return existingProgress;
    }

    const progress = new this.progressModel({
      courseId,
      userId,
      levelProgress: [],
      chapterProgress: [],
      totalScore: 0,
      totalStars: 0,
      totalTimeSpent: 0,
      completedLevels: 0,
      totalLevels: 0,
      completedChapters: 0,
      totalChapters: 0,
      isCompleted: false,
    });

    return progress.save();
  }

  async updateLevelProgress(
    courseId: string,
    userId: string,
    levelId: string,
    sessionData: {
      score: number;
      stars: number;
      timeSpent: number;
    }
  ): Promise<{ progress: CourseProgress; isCourseCompleted: boolean }> {
    let progress = await this.getCourseProgress(courseId, userId);

    if (!progress) {
      progress = await this.initializeCourseProgress(courseId, userId);
    }

    // Update level progress
    const existingLevelIndex = progress.levelProgress.findIndex(
      (lp) => lp.levelId === levelId
    );

    if (existingLevelIndex >= 0) {
      const levelProg = progress.levelProgress[existingLevelIndex];
      levelProg.attempts += 1;
      levelProg.totalTimeSpent += sessionData.timeSpent;

      if (sessionData.score > levelProg.bestScore) {
        levelProg.bestScore = sessionData.score;
      }
      if (sessionData.stars > levelProg.bestStars) {
        levelProg.bestStars = sessionData.stars;
      }
      if (!levelProg.completed && sessionData.score > 0) {
        levelProg.completed = true;
        levelProg.firstCompletedAt = new Date();
      }
      if (sessionData.score > 0) {
        levelProg.lastCompletedAt = new Date();
      }
    } else {
      progress.levelProgress.push({
        levelId,
        completed: sessionData.score > 0,
        bestScore: sessionData.score,
        bestStars: sessionData.stars,
        attempts: 1,
        totalTimeSpent: sessionData.timeSpent,
        firstCompletedAt: sessionData.score > 0 ? new Date() : undefined,
        lastCompletedAt: sessionData.score > 0 ? new Date() : undefined,
      });
    }

    // Recalculate course progress
    const courseProgressData = await this.calculateCourseProgress(
      courseId,
      userId,
      progress
    );

    // Update progress document
    Object.assign(progress, courseProgressData);

    await progress.save();

    return {
      progress,
      isCourseCompleted: courseProgressData.isCompleted,
    };
  }

  async getUserPlayingCourses(userId: string): Promise<CourseProgress[]> {
    return this.progressModel
      .find({ userId, isCompleted: false })
      .sort({ updatedAt: -1 })
      .exec();
  }

  async getUserCompletedCourses(userId: string): Promise<CourseProgress[]> {
    return this.progressModel
      .find({ userId, isCompleted: true })
      .sort({ updatedAt: -1 })
      .exec();
  }

  private async calculateCourseProgress(
    courseId: string,
    userId: string,
    progress: CourseProgressDocument
  ): Promise<Partial<CourseProgress>> {
    const chapters = await this.chaptersService.findCourseChapters(
      courseId,
      userId
    );

    let totalLevels = 0;
    let completedLevels = 0;
    let totalStars = 0;
    let completedChapters = 0;

    for (const chapter of chapters) {
      const levels = await this.levelsService.findChapterLevels(
        chapter._id.toString(),
        userId
      );

      const levelIds = levels.map((level) => level._id.toString());
      const completedLevelsInChapter = progress.levelProgress.filter(
        (lp) => lp.completed && levelIds.includes(lp.levelId)
      ).length;

      const starsInChapter = progress.levelProgress
        .filter((lp) => levelIds.includes(lp.levelId))
        .reduce((sum, lp) => sum + lp.bestStars, 0);

      totalLevels += levels.length;
      completedLevels += completedLevelsInChapter;
      totalStars += starsInChapter;

      if (
        completedLevelsInChapter === levels.length &&
        levels.length > 0
      ) {
        completedChapters++;
      }
    }

    const totalScore = progress.levelProgress.reduce(
      (sum, lp) => sum + lp.bestScore,
      0
    );

    const totalTimeSpent = progress.levelProgress.reduce(
      (sum, lp) => sum + lp.totalTimeSpent,
      0
    );

    const isCompleted = completedLevels === totalLevels && totalLevels > 0;

    return {
      totalLevels,
      completedLevels,
      totalStars,
      totalScore,
      totalTimeSpent,
      completedChapters,
      totalChapters: chapters.length,
      isCompleted,
      completedAt: isCompleted ? new Date() : undefined,
    };
  }
}