import { UseGuards } from "@nestjs/common";
import { Query, Resolver } from "@nestjs/graphql";

import { CurrentUser } from "../common/decorators/current-user.decorator";
import { GqlAuthGuard } from "../common/guards/gql-auth.guard";
import { JwtPayload } from "../common/interfaces/jwt-payload.interface";
import { StatsService } from "./stats.service";
import { UserStats } from "./schemas/user-stats.schema";

@Resolver()
@UseGuards(GqlAuthGuard)
export class StatsResolver {
  constructor(private readonly statsService: StatsService) {}

  @Query(() => UserStats)
  async myStats(@CurrentUser() user: JwtPayload): Promise<UserStats> {
    return this.statsService.getUserStats(user.sub);
  }
}