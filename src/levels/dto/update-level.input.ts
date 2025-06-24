import { Field, InputType } from "@nestjs/graphql";
import { Type } from "class-transformer";
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { QuestionInput } from "../schemas/question.schema";

@InputType()
export class UpdateLevelInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: "Title must be at least 3 characters long" })
  @MaxLength(100, { message: "Title must not exceed 100 characters" })
  title?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(10, { message: "Description must be at least 10 characters long" })
  @MaxLength(500, { message: "Description must not exceed 500 characters" })
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(1, { message: "Order must be at least 1" })
  order?: number;

  @Field(() => [QuestionInput], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionInput)
  questions?: QuestionInput[];
}
