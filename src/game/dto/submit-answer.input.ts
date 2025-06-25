import { Field, InputType } from "@nestjs/graphql";
import { IsNumber, IsString, ValidateIf } from "class-validator";

@InputType()
export class SubmitAnswerInput {
  @Field()
  @IsString()
  sessionId: string;

  @Field()
  @IsNumber()
  questionIndex: number;

  @Field({ nullable: true })
  @ValidateIf((o) => o.booleanAnswer !== undefined)
  booleanAnswer?: boolean;

  @Field({ nullable: true })
  @ValidateIf((o) => o.selectedOptionIndex !== undefined)
  @IsNumber()
  selectedOptionIndex?: number;

  @Field(() => [String], { nullable: true })
  @ValidateIf((o) => o.pairMatches !== undefined)
  pairMatches?: string[];

  @Field(() => [String], { nullable: true })
  @ValidateIf((o) => o.sequenceOrder !== undefined)
  sequenceOrder?: string[];

  @Field({ nullable: true })
  @ValidateIf((o) => o.freeAnswer !== undefined)
  @IsString()
  freeAnswer?: string;

  @Field()
  @IsNumber()
  timeSpent: number; // in seconds
}