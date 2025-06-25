import { Field, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class LevelCompletionDto {
  @Field()
  levelId: string;

  @Field()
  courseId: string;

  @Field()
  chapterId: string;

  @Field(() => Int)
  score: number;

  @Field(() => Int)
  maxScore: number;

  @Field(() => Int)
  stars: number;

  @Field(() => Int)
  correctAnswers: number;

  @Field(() => Int)
  totalQuestions: number;

  @Field(() => Int)
  timeSpent: number; // in seconds

  @Field()
  isNewHighScore: boolean;

  @Field()
  nextLevelId?: string;

  @Field()
  isChapterCompleted: boolean;

  @Field()
  isCourseCompleted: boolean;
}