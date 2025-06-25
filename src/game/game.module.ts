import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { ChaptersModule } from "../chapters/chapters.module";
import { CoursesModule } from "../courses/courses.module";
import { LevelsModule } from "../levels/levels.module";
import { ProgressModule } from "../progress/progress.module";
import { GameGateway } from "./game.gateway";
import { GameResolver } from "./game.resolver";
import { GameService } from "./game.service";
import { GameSession, GameSessionSchema } from "./schemas/game-session.schema";
import { UserStats, UserStatsSchema } from "./schemas/user-stats.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GameSession.name, schema: GameSessionSchema },
      { name: UserStats.name, schema: UserStatsSchema },
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get("JWT_SECRET"),
        signOptions: {
          expiresIn: configService.get("JWT_EXPIRES_IN"),
        },
      }),
    }),
    CoursesModule,
    ChaptersModule,
    LevelsModule,
    ProgressModule,
  ],
  providers: [GameService, GameResolver, GameGateway],
  exports: [GameService],
})
export class GameModule {}
