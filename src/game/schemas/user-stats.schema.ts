import { Field, ID, Int, ObjectType } from "@nestjs/graphql";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { CourseCategory } from "../../courses/schemas/course.schema";

export type UserStatsDocument = UserStats & Document;

export class CategoryStat {
  category: CourseCategory;
  coursesCompleted: number;
  levelsCompleted: number;
  totalStars: number;
  totalScore: number;
}

export class DailyActivity {
  date: Date;
  levelsCompleted: number;
  timeSpent: number; // in seconds
  starsEarned: number;
  score: number;
}

@Schema({ timestamps: true })
@ObjectType()
export class UserStats {
  @Field(() => ID)
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true, unique: true })
  @Field(() => String)
  userId: string;

  @Prop({ default: 0 })
  @Field(() => Int)
  totalCoursesCompleted: number;

  @Prop({ default: 0 })
  @Field(() => Int)
  totalLevelsCompleted: number;

  @Prop({ default: 0 })
  @Field(() => Int)
  totalTimeSpent: number; // in seconds

  @Prop({ default: 0 })
  @Field(() => Int)
  totalLivesLost: number;

  @Prop({ default: 0 })
  @Field(() => Int)
  totalStarsEarned: number;

  @Prop({ default: 0 })
  @Field(() => Int)
  totalScore: number;

  @Prop({ default: 0 })
  @Field(() => Int)
  currentStreak: number; // days in a row with activity

  @Prop({ default: 0 })
  @Field(() => Int)
  longestStreak: number;

  @Prop({ type: Array, default: [] })
  categoryStats: CategoryStat[];

  @Prop({ type: Array, default: [] })
  dailyActivity: DailyActivity[];

  @Prop()
  lastActivityDate?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

export const UserStatsSchema = SchemaFactory.createForClass(UserStats);

// Add indexes
UserStatsSchema.index({ userId: 1 }, { unique: true });
UserStatsSchema.index({ totalScore: -1 }); // For leaderboards
UserStatsSchema.index({ currentStreak: -1 }); // For streak leaderboards