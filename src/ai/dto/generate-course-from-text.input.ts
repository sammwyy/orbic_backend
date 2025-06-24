import { Field, InputType } from "@nestjs/graphql";
import { IsEnum, IsOptional, IsString, MinLength } from "class-validator";
import { CourseCategory } from "../../courses/schemas/course.schema";

@InputType()
export class GenerateCourseFromTextInput {
  @Field()
  @IsString()
  @MinLength(100, { message: "Content must be at least 100 characters long" })
  content: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  title?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => CourseCategory, { nullable: true })
  @IsOptional()
  @IsEnum(CourseCategory)
  category?: CourseCategory;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  lang?: string;
}
