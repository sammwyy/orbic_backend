import { UseGuards } from "@nestjs/common";
import { Args, ID, Mutation, Query, Resolver } from "@nestjs/graphql";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { GqlAuthGuard } from "../common/guards/gql-auth.guard";
import { JwtPayload } from "../common/interfaces/jwt-payload.interface";
import { ChaptersService } from "./chapters.service";
import { CreateChapterInput } from "./dto/create-chapter.input";
import { UpdateChapterInput } from "./dto/update-chapter.input";
import { Chapter } from "./schemas/chapter.schema";

@Resolver(() => Chapter)
export class ChaptersResolver {
  constructor(private readonly chaptersService: ChaptersService) {}

  @Mutation(() => Chapter)
  @UseGuards(GqlAuthGuard)
  async createChapter(
    @Args("input") createChapterInput: CreateChapterInput,
    @CurrentUser() user: JwtPayload
  ): Promise<Chapter> {
    return this.chaptersService.create(createChapterInput, user.sub);
  }

  @Mutation(() => Chapter)
  @UseGuards(GqlAuthGuard)
  async updateChapter(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") updateChapterInput: UpdateChapterInput,
    @CurrentUser() user: JwtPayload
  ): Promise<Chapter> {
    return this.chaptersService.update(id, updateChapterInput, user.sub);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async deleteChapter(
    @Args("id", { type: () => ID }) id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<boolean> {
    return this.chaptersService.delete(id, user.sub);
  }

  @Mutation(() => [Chapter])
  @UseGuards(GqlAuthGuard)
  async reorderChapters(
    @Args("courseId", { type: () => ID }) courseId: string,
    @Args("chapterIds", { type: () => [ID] }) chapterIds: string[],
    @CurrentUser() user: JwtPayload
  ): Promise<Chapter[]> {
    return this.chaptersService.reorderChapters(courseId, chapterIds, user.sub);
  }

  @Query(() => Chapter, { nullable: true })
  async chapter(
    @Args("id", { type: () => ID }) id: string,
    @CurrentUser() user?: JwtPayload
  ): Promise<Chapter> {
    return this.chaptersService.findById(id, user?.sub);
  }

  @Query(() => [Chapter])
  async courseChapters(
    @Args("courseId", { type: () => ID }) courseId: string,
    @CurrentUser() user?: JwtPayload
  ): Promise<Chapter[]> {
    return this.chaptersService.findCourseChapters(courseId, user?.sub);
  }
}
