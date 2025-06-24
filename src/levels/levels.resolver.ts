import { UseGuards } from "@nestjs/common";
import { Args, ID, Mutation, Query, Resolver } from "@nestjs/graphql";

import { CurrentUser } from "../common/decorators/current-user.decorator";
import { GqlAuthGuard } from "../common/guards/gql-auth.guard";
import { JwtPayload } from "../common/interfaces/jwt-payload.interface";
import { CreateLevelInput } from "./dto/create-level.input";
import { UpdateLevelInput } from "./dto/update-level.input";
import { LevelsService } from "./levels.service";
import { Level } from "./schemas/level.schema";

@Resolver(() => Level)
export class LevelsResolver {
  constructor(private readonly levelsService: LevelsService) {}

  @Mutation(() => Level)
  @UseGuards(GqlAuthGuard)
  async createLevel(
    @Args("input") createLevelInput: CreateLevelInput,
    @CurrentUser() user: JwtPayload
  ): Promise<Level> {
    return this.levelsService.create(createLevelInput, user.sub);
  }

  @Mutation(() => Level)
  @UseGuards(GqlAuthGuard)
  async updateLevel(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") updateLevelInput: UpdateLevelInput,
    @CurrentUser() user: JwtPayload
  ): Promise<Level> {
    return this.levelsService.update(id, updateLevelInput, user.sub);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  async deleteLevel(
    @Args("id", { type: () => ID }) id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<boolean> {
    return this.levelsService.delete(id, user.sub);
  }

  @Mutation(() => [Level])
  @UseGuards(GqlAuthGuard)
  async reorderLevels(
    @Args("chapterId", { type: () => ID }) chapterId: string,
    @Args("levelIds", { type: () => [ID] }) levelIds: string[],
    @CurrentUser() user: JwtPayload
  ): Promise<Level[]> {
    return this.levelsService.reorderLevels(chapterId, levelIds, user.sub);
  }

  @Query(() => Level, { nullable: true })
  async level(
    @Args("id", { type: () => ID }) id: string,
    @CurrentUser() user?: JwtPayload
  ): Promise<Level> {
    return this.levelsService.findById(id, user?.sub);
  }

  @Query(() => [Level])
  async chapterLevels(
    @Args("chapterId", { type: () => ID }) chapterId: string,
    @CurrentUser() user?: JwtPayload
  ): Promise<Level[]> {
    return this.levelsService.findChapterLevels(chapterId, user?.sub);
  }
}
