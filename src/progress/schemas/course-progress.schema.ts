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
  score: number;

  @Field(() => Int)
  maxScore: number;

  @Field(() => Int)
  attempts: number;

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

  @Prop({ default: 0 })
  @Field(() => Int)
  currentChapter: number;

  @Prop({ default: 0 })
  @Field(() => Int)
  currentLevel: number;

  @Prop({ type: Array, default: [] })
  @Field(() => [LevelProgress])
  levelProgress: LevelProgress[];

  @Prop({ default: 0 })
  @Field(() => Int)
  totalScore: number;

  @Prop({ default: 0 })
  @Field(() => Int)
  totalMaxScore: number;

  @Prop({ default: false })
  @Field()
  completed: boolean;

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
