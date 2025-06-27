import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";

import { CoursesModule } from "../courses/courses.module";
import { StatsResolver } from "./stats.resolver";
import { StatsService } from "./stats.service";
import { UserStats, UserStatsSchema } from "./schemas/user-stats.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
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
  ],
  providers: [StatsService, StatsResolver],
  exports: [StatsService],
})
export class StatsModule {}