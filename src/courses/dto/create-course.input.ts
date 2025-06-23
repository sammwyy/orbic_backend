import { Field, InputType } from "@nestjs/graphql";
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { CourseCategory, CourseVisibility } from "../schemas/course.schema";

@InputType()
export class CreateCourseInput {
  @Field()
  @IsString()
  @MinLength(3, { message: "Title must be at least 3 characters long" })
  @MaxLength(100, { message: "Title must not exceed 100 characters" })
  title: string;

  @Field()
  @IsString()
  @MinLength(10, { message: "Description must be at least 10 characters long" })
  @MaxLength(500, { message: "Description must not exceed 500 characters" })
  description: string;

  @Field()
  @IsString()
  @MinLength(2, { message: "Language code must be at least 2 characters" })
  @MaxLength(5, { message: "Language code must not exceed 5 characters" })
  lang: string;

  @Field(() => CourseCategory)
  @IsEnum(CourseCategory, { message: "Invalid category" })
  category: CourseCategory;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  thumbnailId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  bannerId?: string;

  @Field(() => CourseVisibility, { nullable: true })
  @IsOptional()
  @IsEnum(CourseVisibility, { message: "Invalid visibility option" })
  visibility?: CourseVisibility;
}
