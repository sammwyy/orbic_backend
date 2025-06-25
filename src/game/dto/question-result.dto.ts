import { Field, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class QuestionResultDto {
  @Field()
  isCorrect: boolean;

  @Field(() => Int)
  livesRemaining: number;

  @Field(() => [String])
  correctAnswer: string[];

  @Field()
  isLastQuestion: boolean;

  @Field(() => Int, { nullable: true })
  nextQuestionIndex?: number;
}
