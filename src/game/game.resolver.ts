import { UseGuards } from "@nestjs/common";
import { Args, ID, Mutation, Query, Resolver } from "@nestjs/graphql";

import { CurrentUser } from "../common/decorators/current-user.decorator";
import { GqlAuthGuard } from "../common/guards/gql-auth.guard";
import { JwtPayload } from "../common/interfaces/jwt-payload.interface";
import { LevelCompletionDto } from "./dto/level-completion.dto";
import { QuestionResultDto } from "./dto/question-result.dto";
import { StartGameSessionInput } from "./dto/start-game-session.input";
import { SubmitAnswerInput } from "./dto/submit-answer.input";
import { GameService } from "./game.service";
import { GameSession } from "./schemas/game-session.schema";

@Resolver()
@UseGuards(GqlAuthGuard)
export class GameResolver {
  constructor(private readonly gameService: GameService) {}

  @Mutation(() => GameSession)
  async startLevel(
    @Args("input") input: StartGameSessionInput,
    @CurrentUser() user: JwtPayload
  ): Promise<GameSession> {
    return this.gameService.startGameSession(input, user.sub);
  }

  @Mutation(() => QuestionResultDto)
  async submitAnswer(
    @Args("input") input: SubmitAnswerInput,
    @CurrentUser() user: JwtPayload
  ): Promise<QuestionResultDto> {
    return this.gameService.submitAnswer(input, user.sub);
  }

  @Mutation(() => QuestionResultDto)
  async skipQuestion(
    @Args("sessionId") sessionId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<QuestionResultDto> {
    return this.gameService.skipQuestion(sessionId, user.sub);
  }

  @Mutation(() => Boolean)
  async abandonSession(
    @Args("sessionId") sessionId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<boolean> {
    return this.gameService.abandonSession(sessionId, user.sub);
  }

  @Query(() => GameSession, { nullable: true })
  async currentGameSession(
    @CurrentUser() user: JwtPayload
  ): Promise<GameSession | null> {
    return this.gameService.getCurrentGameSession(user.sub);
  }

  @Query(() => LevelCompletionDto)
  async levelCompletion(
    @Args("sessionId", { type: () => ID }) sessionId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<LevelCompletionDto> {
    return this.gameService.getCompletedSession(sessionId, user.sub);
  }
}