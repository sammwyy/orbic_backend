import { Field, ID, ObjectType } from "@nestjs/graphql";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ChapterDocument = Chapter & Document;

@Schema({ timestamps: true })
@ObjectType()
export class Chapter {
  @Field(() => ID)
  _id: Types.ObjectId;

  @Prop({ required: true })
  @Field()
  title: string;

  @Prop({ required: true })
  @Field()
  description: string;

  @Prop({ type: Types.ObjectId, ref: "Course", required: true })
  @Field(() => String)
  courseId: string;

  @Prop({ default: 1 })
  @Field()
  order: number;

  @Prop({ default: 0 })
  @Field()
  levelsCount: number;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

export const ChapterSchema = SchemaFactory.createForClass(Chapter);

// Add indexes
ChapterSchema.index({ courseId: 1 });
ChapterSchema.index({ order: 1 });
ChapterSchema.index({ courseId: 1, order: 1 });
