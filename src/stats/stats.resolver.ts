import { UseGuards } from "@nestjs/common";
import { Query, Resolver } from "@nestjs/graphql";

import { CurrentUser } from "../common/decorators/current-user.decorator";
import { GqlAuthGuard } from "../common/guards/gql-auth.guard";
import { JwtPayload } from "../common/interfaces/jwt-payload.interface";
import { UserStatsDto } from "./dto/user-stats.dto";
import { StatsService } from "./stats.service";

@Resolver()
@UseGuards(GqlAuthGuard)
export class StatsResolver {
  constructor(private readonly statsService: StatsService) {}

  @Query(() => UserStatsDto)
  async myStats(@CurrentUser() user: JwtPayload): Promise<UserStatsDto> {
    return this.statsService.getUserStats(user.sub);
  }
}