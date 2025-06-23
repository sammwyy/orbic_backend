import { Field, InputType } from "@nestjs/graphql";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { CourseCategory, CourseVisibility } from "../schemas/course.schema";

@InputType()
export class CourseFilterInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  @Field(() => CourseCategory, { nullable: true })
  @IsOptional()
  @IsEnum(CourseCategory)
  category?: CourseCategory;

  @Field(() => CourseVisibility, { nullable: true })
  @IsOptional()
  @IsEnum(CourseVisibility)
  visibility?: CourseVisibility;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  author?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  lang?: string;
}
