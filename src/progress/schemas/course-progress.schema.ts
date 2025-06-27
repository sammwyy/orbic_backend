import { Field, ID, Int, ObjectType } from "@nestjs/graphql";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type CourseProgressDocument = CourseProgress & Document;

@ObjectType()
export class LevelProgress {
  @Field(() => String)
  levelId: string;

  @Field()
  completed: boolean;

  @Field(() => Int)
  bestScore: number;

  @Field(() => Int)
  bestStars: number;

  @Field(() => Int)
  attempts: number;

  @Field(() => Int)
  totalTimeSpent: number; // in seconds

  @Field()
  firstCompletedAt?: Date;

  @Field()
  lastCompletedAt?: Date;
}

@ObjectType()
export class ChapterProgress {
  @Field(() => String)
  chapterId: string;

  @Field(() => Int)
  completedLevels: number;

  @Field(() => Int)
  totalLevels: number;

  @Field(() => Int)
  totalStars: number;

  @Field(() => Int)
  maxPossibleStars: number;

  @Field()
  isCompleted: boolean;

  @Field()
  isUnlocked: boolean;

  @Field()
  completedAt?: Date;
}

@Schema({ timestamps: true })
@ObjectType()
export class CourseProgress {
  @Field(() => ID)
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  @Field(() => String)
  userId: string;

  @Prop({ type: Types.ObjectId, ref: "Course", required: true })
  @Field(() => String)
  courseId: string;

  @Prop({ type: Array, default: [] })
  @Field(() => [LevelProgress])
  levelProgress: LevelProgress[];

  @Prop({ type: Array, default: [] })
  @Field(() => [ChapterProgress])
  chapterProgress: ChapterProgress[];

  @Prop({ default: 0 })
  @Field(() => Int)
  totalScore: number;

  @Prop({ default: 0 })
  @Field(() => Int)
  totalStars: number;

  @Prop({ default: 0 })
  @Field(() => Int)
  totalTimeSpent: number;

  @Prop({ default: 0 })
  @Field(() => Int)
  completedLevels: number;

  @Prop({ default: 0 })
  @Field(() => Int)
  totalLevels: number;

  @Prop({ default: 0 })
  @Field(() => Int)
  completedChapters: number;

  @Prop({ default: 0 })
  @Field(() => Int)
  totalChapters: number;

  @Prop({ default: false })
  @Field()
  isCompleted: boolean;

  @Prop()
  @Field({ nullable: true })
  completedAt?: Date;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

export const CourseProgressSchema =
  SchemaFactory.createForClass(CourseProgress);

// Add indexes
CourseProgressSchema.index({ userId: 1 });
CourseProgressSchema.index({ courseId: 1 });
CourseProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });