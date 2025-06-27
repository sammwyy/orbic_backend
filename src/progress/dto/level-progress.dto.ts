import { Field, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class LevelAttempt {
  @Field()
  sessionId: string;

  @Field()
  completedAt: Date;

  @Field(() => Int)
  score: number;

  @Field(() => Int)
  stars: number;

  @Field(() => Int)
  timeSpent: number; // in seconds
}

@ObjectType()
export class LevelProgressDto {
  @Field()
  levelId: string;

  @Field()
  isCompleted: boolean;

  @Field(() => Int)
  bestScore: number;

  @Field(() => Int)
  bestStars: number;

  @Field(() => Int)
  attempts: number;

  @Field(() => Int)
  totalTimeSpent: number; // in seconds

  @Field(() => [LevelAttempt])
  recentAttempts: LevelAttempt[];
}