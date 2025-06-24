import { Field, ID, ObjectType, registerEnumType } from "@nestjs/graphql";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type CourseDocument = Course & Document;

export enum CourseVisibility {
  PUBLIC = "public",
  PRIVATE = "private",
  LINK_ONLY = "link-only",
}

export enum CourseCategory {
  MATHEMATICS = "mathematics",
  SCIENCE = "science",
  TECHNOLOGY = "technology",
  LANGUAGE = "language",
  HISTORY = "history",
  ART = "art",
  BUSINESS = "business",
  HEALTH = "health",
  OTHER = "other",
}

export type CourseCategoryType = (typeof COURSE_CATEGORIES)[number];

export const COURSE_CATEGORIES = [
  "mathematics",
  "science",
  "technology",
  "language",
  "history",
  "art",
  "business",
  "health",
  "other",
] as const;

// Register enums for GraphQL
registerEnumType(CourseVisibility, {
  name: "CourseVisibility",
  description: "Course visibility options",
});

registerEnumType(CourseCategory, {
  name: "CourseCategory",
  description: "Course category options",
});

@Schema({ timestamps: true })
@ObjectType()
export class Course {
  @Field(() => ID)
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  @Field(() => String)
  author: string;

  @Prop({ required: true })
  @Field()
  title: string;

  @Prop({ required: true })
  @Field()
  description: string;

  @Prop({ required: true })
  @Field()
  lang: string;

  @Prop({
    required: true,
    enum: Object.values(CourseCategory),
    default: CourseCategory.OTHER,
  })
  @Field(() => CourseCategory)
  category: CourseCategory;

  @Prop({ default: 0 })
  @Field()
  chaptersCount: number;

  @Prop()
  @Field({ nullable: true })
  thumbnailId?: string;

  @Prop()
  @Field({ nullable: true })
  bannerId?: string;

  @Prop({
    enum: Object.values(CourseVisibility),
    default: CourseVisibility.PRIVATE,
  })
  @Field(() => CourseVisibility)
  visibility: CourseVisibility;

  @Prop({ default: false })
  @Field()
  isApproved: boolean;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

export const CourseSchema = SchemaFactory.createForClass(Course);

// Add indexes
CourseSchema.index({ author: 1 });
CourseSchema.index({ visibility: 1 });
CourseSchema.index({ category: 1 });
CourseSchema.index({ isApproved: 1 });
CourseSchema.index({ createdAt: -1 });
CourseSchema.index({ title: "text", description: "text" });
