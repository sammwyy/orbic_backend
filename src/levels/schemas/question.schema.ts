import {
  Field,
  InputType,
  ObjectType,
  createUnionType,
  registerEnumType,
} from "@nestjs/graphql";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsString,
  ValidateNested,
} from "class-validator";

export enum QuestionType {
  TRUE_FALSE = "true_false",
  MULTIPLE_CHOICE = "multiple_choice",
  PAIRS = "pairs",
  SEQUENCE = "sequence",
  FREE_CHOICE = "free_choice",
}

registerEnumType(QuestionType, {
  name: "QuestionType",
  description: "Available question types",
});

// Base question interface
export interface QuestionBase {
  type: QuestionType;
}

@InputType("TrueFalseQuestionInput")
@ObjectType("TrueFalseQuestion")
export class TrueFalseQuestion implements QuestionBase {
  @Field(() => QuestionType)
  @IsEnum(QuestionType)
  type: QuestionType.TRUE_FALSE;

  @Field()
  @IsString()
  question: string;

  @Field()
  @IsBoolean()
  correctAnswer: boolean;
}

@InputType("MultipleChoiceOptionInput")
@ObjectType("MultipleChoiceOption")
export class MultipleChoiceOption {
  @Field()
  @IsString()
  text: string;

  @Field()
  @IsBoolean()
  isCorrect: boolean;
}

@InputType("MultipleChoiceQuestionInput")
@ObjectType("MultipleChoiceQuestion")
export class MultipleChoiceQuestion implements QuestionBase {
  @Field(() => QuestionType)
  @IsEnum(QuestionType)
  type: QuestionType.MULTIPLE_CHOICE;

  @Field()
  @IsString()
  question: string;

  @Field(() => [MultipleChoiceOption])
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => MultipleChoiceOption)
  options: MultipleChoiceOption[];
}

@InputType("PairItemInput")
@ObjectType("PairItem")
export class PairItem {
  @Field()
  @IsString()
  left: string;

  @Field()
  @IsString()
  right: string;
}

@InputType("PairsQuestionInput")
@ObjectType("PairsQuestion")
export class PairsQuestion implements QuestionBase {
  @Field(() => QuestionType)
  @IsEnum(QuestionType)
  type: QuestionType.PAIRS;

  @Field()
  @IsString()
  question: string;

  @Field(() => [PairItem])
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => PairItem)
  pairs: PairItem[];
}

@InputType("SequenceQuestionInput")
@ObjectType("SequenceQuestion")
export class SequenceQuestion implements QuestionBase {
  @Field(() => QuestionType)
  @IsEnum(QuestionType)
  type: QuestionType.SEQUENCE;

  @Field()
  @IsString()
  question: string;

  @Field(() => [String])
  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  correctSequence: string[];
}

@InputType("FreeChoiceQuestionInput")
@ObjectType("FreeChoiceQuestion")
export class FreeChoiceQuestion implements QuestionBase {
  @Field(() => QuestionType)
  @IsEnum(QuestionType)
  type: QuestionType.FREE_CHOICE;

  @Field()
  @IsString()
  question: string;

  @Field(() => [String])
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  acceptedAnswers: string[];
}

// Output Union
export const Question = createUnionType({
  name: "Question",
  types: () => [
    TrueFalseQuestion,
    MultipleChoiceQuestion,
    PairsQuestion,
    SequenceQuestion,
    FreeChoiceQuestion,
  ],
  resolveType(question: QuestionBase) {
    switch (question.type) {
      case QuestionType.TRUE_FALSE:
        return TrueFalseQuestion;
      case QuestionType.MULTIPLE_CHOICE:
        return MultipleChoiceQuestion;
      case QuestionType.PAIRS:
        return PairsQuestion;
      case QuestionType.SEQUENCE:
        return SequenceQuestion;
      case QuestionType.FREE_CHOICE:
        return FreeChoiceQuestion;
    }
  },
});

@InputType()
export class QuestionInput {
  @Field(() => QuestionType)
  @IsEnum(QuestionType)
  type: QuestionType;

  @Field({ nullable: true })
  @IsString()
  question?: string;

  // TRUE_FALSE
  @Field({ nullable: true })
  @IsBoolean()
  correctAnswer?: boolean;

  // MULTIPLE_CHOICE
  @Field(() => [MultipleChoiceOption], { nullable: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MultipleChoiceOption)
  options?: MultipleChoiceOption[];

  // PAIRS
  @Field(() => [PairItem], { nullable: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PairItem)
  pairs?: PairItem[];

  // SEQUENCE
  @Field(() => [String], { nullable: true })
  @IsArray()
  @IsString({ each: true })
  correctSequence?: string[];

  // FREE_CHOICE
  @Field(() => [String], { nullable: true })
  @IsArray()
  @IsString({ each: true })
  acceptedAnswers?: string[];
}

export type QuestionUnion =
  | TrueFalseQuestion
  | MultipleChoiceQuestion
  | PairsQuestion
  | SequenceQuestion
  | FreeChoiceQuestion;
