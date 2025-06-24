import { Field, ID, ObjectType } from "@nestjs/graphql";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema, Types } from "mongoose";
import { Question, QuestionUnion } from "./question.schema";

export type LevelDocument = Level & Document;

@Schema({ timestamps: true })
@ObjectType()
export class Level {
  @Field(() => ID)
  _id: Types.ObjectId;

  @Prop({ required: true })
  @Field()
  title: string;

  @Prop({ required: true })
  @Field()
  description: string;

  @Prop({ type: Types.ObjectId, ref: "Chapter", required: true })
  @Field(() => String)
  chapterId: string;

  @Prop({ type: Types.ObjectId, ref: "Course", required: true })
  @Field(() => String)
  courseId: string;

  @Prop({ default: 1 })
  @Field()
  order: number;

  @Prop({
    type: [MongooseSchema.Types.Mixed],
    default: [],
  })
  @Field(() => [Question])
  questions: QuestionUnion[];

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

export const LevelSchema = SchemaFactory.createForClass(Level);

// Add indexes
LevelSchema.index({ chapterId: 1 });
LevelSchema.index({ courseId: 1 });
LevelSchema.index({ order: 1 });
LevelSchema.index({ chapterId: 1, order: 1 });
