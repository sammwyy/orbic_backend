import { Field, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class ChapterProgressDto {
  @Field()
  chapterId: string;

  @Field()
  title: string;

  @Field(() => Int)
  completedLevels: number;

  @Field(() => Int)
  totalLevels: number;

  @Field(() => Int)
  totalStars: number;

  @Field(() => Int)
  maxPossibleStars: number;

  @Field()
  isCompleted: boolean;

  @Field()
  isUnlocked: boolean;
}

@ObjectType()
export class CourseProgressDto {
  @Field()
  courseId: string;

  @Field(() => Int)
  completedLevels: number;

  @Field(() => Int)
  totalLevels: number;

  @Field(() => Int)
  totalStars: number;

  @Field(() => Int)
  maxPossibleStars: number;

  @Field(() => Int)
  completedChapters: number;

  @Field(() => Int)
  totalChapters: number;

  @Field()
  isCompleted: boolean;

  @Field(() => Int)
  completionPercentage: number;

  @Field(() => [ChapterProgressDto])
  chapterProgress: ChapterProgressDto[];
}