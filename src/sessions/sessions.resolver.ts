import { UseGuards } from "@nestjs/common";
import { Mutation, Resolver } from "@nestjs/graphql";

import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { GqlAuthGuard } from "@/common/guards/gql-auth.guard";
import { JwtPayload } from "@/common/interfaces/jwt-payload.interface";
import { SessionsService } from "./sessions.service";

@Resolver()
@UseGuards(GqlAuthGuard)
export class SessionsResolver {
  constructor(private readonly sessionsService: SessionsService) {}

  @Mutation(() => Boolean)
  async logout(@CurrentUser() { sessionId }: JwtPayload): Promise<boolean> {
    return await this.sessionsService.deactivateSession(sessionId);
  }

  @Mutation(() => Boolean)
  async logoutAllSessions(
    @CurrentUser() { sub: userId }: JwtPayload
  ): Promise<boolean> {
    await this.sessionsService.deactivateAllUserSessions(userId);
    return true;
  }
}
