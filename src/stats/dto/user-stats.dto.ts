import { Field, Int, ObjectType } from "@nestjs/graphql";
import { CourseCategory } from "../../courses/schemas/course.schema";

@ObjectType()
export class CategoryStatsDto {
  @Field(() => CourseCategory)
  category: CourseCategory;

  @Field(() => Int)
  coursesCompleted: number;

  @Field(() => Int)
  levelsCompleted: number;

  @Field(() => Int)
  totalStars: number;

  @Field(() => Int)
  totalScore: number;
}

@ObjectType()
export class UserStatsDto {
  @Field(() => Int)
  totalCoursesCompleted: number;

  @Field(() => Int)
  totalLevelsCompleted: number;

  @Field(() => Int)
  totalTimeSpent: number; // in seconds

  @Field(() => Int)
  totalLivesLost: number;

  @Field(() => Int)
  totalStarsEarned: number;

  @Field(() => Int)
  totalScore: number;

  @Field(() => Int)
  currentStreak: number; // days in a row with activity

  @Field(() => Int)
  longestStreak: number;

  @Field(() => [CategoryStatsDto])
  categoriesStats: CategoryStatsDto[];
}