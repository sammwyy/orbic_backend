import { UseGuards } from "@nestjs/common";
import { Args, ID, Mutation, Query, Resolver } from "@nestjs/graphql";

import { CurrentUser } from "../common/decorators/current-user.decorator";
import { GqlAuthGuard } from "../common/guards/gql-auth.guard";
import { JwtPayload } from "../common/interfaces/jwt-payload.interface";
import { CourseProgressDto } from "./dto/course-progress.dto";
import { LevelProgressDto } from "./dto/level-progress.dto";
import { ProgressService } from "./progress.service";
import { CourseProgress } from "./schemas/course-progress.schema";

@Resolver(() => CourseProgress)
@UseGuards(GqlAuthGuard)
export class ProgressResolver {
  constructor(private readonly progressService: ProgressService) {}

  @Query(() => CourseProgress, { nullable: true })
  async courseProgress(
    @Args("courseId", { type: () => ID }) courseId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<CourseProgress | null> {
    return this.progressService.getCourseProgress(courseId, user.sub);
  }

  @Query(() => CourseProgressDto)
  async courseProgressDetails(
    @Args("courseId", { type: () => ID }) courseId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<CourseProgressDto> {
    return this.progressService.getCourseProgressDto(courseId, user.sub);
  }

  @Query(() => LevelProgressDto)
  async levelProgress(
    @Args("levelId", { type: () => ID }) levelId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<LevelProgressDto> {
    return this.progressService.getLevelProgress(levelId, user.sub);
  }

  @Mutation(() => CourseProgress)
  async initializeCourseProgress(
    @Args("courseId", { type: () => ID }) courseId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<CourseProgress> {
    return this.progressService.initializeCourseProgress(courseId, user.sub);
  }

  @Query(() => [CourseProgress])
  async myPlayingCourses(
    @CurrentUser() user: JwtPayload
  ): Promise<CourseProgress[]> {
    return this.progressService.getUserPlayingCourses(user.sub);
  }

  @Query(() => [CourseProgress])
  async myCompletedCourses(
    @CurrentUser() user: JwtPayload
  ): Promise<CourseProgress[]> {
    return this.progressService.getUserCompletedCourses(user.sub);
  }
}