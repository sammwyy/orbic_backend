import { Field, ID, Int, ObjectType, registerEnumType } from "@nestjs/graphql";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type GameSessionDocument = GameSession & Document;

export enum GameSessionStatus {
  ACTIVE = "active",
  COMPLETED = "completed",
  ABANDONED = "abandoned",
  EXPIRED = "expired",
}

registerEnumType(GameSessionStatus, {
  name: "GameSessionStatus",
  description: "Game session status options",
});

export class AnsweredQuestion {
  questionIndex: number;
  isCorrect: boolean;
  userAnswer: any;
  timeSpent: number; // in seconds
}

@Schema({ timestamps: true })
@ObjectType()
export class GameSession {
  @Field(() => ID)
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  @Field(() => String)
  userId: string;

  @Prop({ type: Types.ObjectId, ref: "Level", required: true })
  @Field(() => String)
  levelId: string;

  @Prop({ type: Types.ObjectId, ref: "Course", required: true })
  @Field(() => String)
  courseId: string;

  @Prop({ type: Types.ObjectId, ref: "Chapter", required: true })
  @Field(() => String)
  chapterId: string;

  @Prop({ default: 3 })
  @Field(() => Int)
  lives: number;

  @Prop({ type: Array, default: [] })
  answeredQuestions: AnsweredQuestion[];

  @Prop({ required: true })
  @Field()
  startTime: Date;

  @Prop()
  @Field({ nullable: true })
  endTime?: Date;

  @Prop({
    enum: Object.values(GameSessionStatus),
    default: GameSessionStatus.ACTIVE,
  })
  @Field(() => GameSessionStatus)
  status: GameSessionStatus;

  @Prop({ default: 0 })
  @Field(() => Int)
  stars: number;

  @Prop({ default: 0 })
  @Field(() => Int)
  score: number;

  @Prop({ default: 0 })
  @Field(() => Int)
  maxScore: number;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

export const GameSessionSchema = SchemaFactory.createForClass(GameSession);

// Add indexes
GameSessionSchema.index({ userId: 1 });
GameSessionSchema.index({ levelId: 1 });
GameSessionSchema.index({ courseId: 1 });
GameSessionSchema.index({ chapterId: 1 });
GameSessionSchema.index({ status: 1 });
GameSessionSchema.index({ createdAt: -1 });
GameSessionSchema.index({ userId: 1, status: 1 });