import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { CoursesService } from "../courses/courses.service";
import { UserStatsDto } from "./dto/user-stats.dto";
import { UserStats, UserStatsDocument } from "./schemas/user-stats.schema";

@Injectable()
export class StatsService {
  constructor(
    @InjectModel(UserStats.name)
    private userStatsModel: Model<UserStatsDocument>,
    private coursesService: CoursesService
  ) {}

  async getUserStats(userId: string): Promise<UserStatsDto> {
    let userStats: UserStatsDocument = await this.userStatsModel
      .findOne({ userId })
      .exec();

    if (!userStats) {
      userStats = await this.initializeUserStats(userId);
    }

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

  async updateUserStats(
    userId: string,
    courseId: string,
    levelId: string,
    sessionData: {
      score: number;
      stars: number;
      timeSpent: number;
      livesLost: number;
      isCourseCompleted?: boolean;
    }
  ): Promise<void> {
    let userStats: UserStatsDocument = await this.userStatsModel
      .findOne({ userId })
      .exec();

    if (!userStats) {
      userStats = await this.initializeUserStats(userId);
    }

    const course = await this.coursesService.findById(courseId);

    // Update general stats
    const updateData: any = {
      $inc: {
        totalLevelsCompleted: 1,
        totalTimeSpent: sessionData.timeSpent,
        totalLivesLost: sessionData.livesLost,
        totalStarsEarned: sessionData.stars,
        totalScore: sessionData.score,
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
        userStats.categoryStats[categoryIndex].totalStars + sessionData.stars;
      updateData[`categoryStats.${categoryIndex}.totalScore`] =
        userStats.categoryStats[categoryIndex].totalScore + sessionData.score;

      if (sessionData.isCourseCompleted) {
        updateData[`categoryStats.${categoryIndex}.coursesCompleted`] =
          userStats.categoryStats[categoryIndex].coursesCompleted + 1;
      }
    } else {
      updateData.$push = {
        categoryStats: {
          category: course.category,
          coursesCompleted: sessionData.isCourseCompleted ? 1 : 0,
          levelsCompleted: 1,
          totalStars: sessionData.stars,
          totalScore: sessionData.score,
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
        timeSpent: sessionData.timeSpent,
        starsEarned: sessionData.stars,
        score: sessionData.score,
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
          userStats.dailyActivity[dailyActivityIndex].timeSpent +
          sessionData.timeSpent;
        updateData[`dailyActivity.${dailyActivityIndex}.starsEarned`] =
          userStats.dailyActivity[dailyActivityIndex].starsEarned +
          sessionData.stars;
        updateData[`dailyActivity.${dailyActivityIndex}.score`] =
          userStats.dailyActivity[dailyActivityIndex].score + sessionData.score;
      } else {
        updateData.$push = updateData.$push || {};
        updateData.$push.dailyActivity = {
          date: today,
          levelsCompleted: 1,
          timeSpent: sessionData.timeSpent,
          starsEarned: sessionData.stars,
          score: sessionData.score,
        };
      }
    }

    // Update last activity date
    updateData.lastActivityDate = new Date();

    // Update course completion count
    if (sessionData.isCourseCompleted) {
      updateData.$inc.totalCoursesCompleted = 1;
    }

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
}