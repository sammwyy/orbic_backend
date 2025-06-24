import { Field, InputType } from "@nestjs/graphql";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { CourseCategory } from "../../courses/schemas/course.schema";

@InputType()
export class GenerateCourseFromFileInput {
  @Field()
  @IsString()
  fileId: string;

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
