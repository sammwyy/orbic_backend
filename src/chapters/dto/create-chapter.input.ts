import { Field, InputType } from "@nestjs/graphql";
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

@InputType()
export class CreateChapterInput {
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
  courseId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(1, { message: "Order must be at least 1" })
  order?: number;
}
