import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { GraphQLModule } from "@nestjs/graphql";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";
import { join } from "path";

import { AiModule } from "./ai/ai.module";
import { AuthModule } from "./auth/auth.module";
import { ChaptersModule } from "./chapters/chapters.module";
import { CoursesModule } from "./courses/courses.module";
import { GameModule } from "./game/game.module";
import { LevelsModule } from "./levels/levels.module";
import { ProgressModule } from "./progress/progress.module";
import { SessionsModule } from "./sessions/sessions.module";
import { StorageModule } from "./storage/storage.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),

    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        autoSchemaFile: join(process.cwd(), "src/schema.gql"),
        sortSchema: true,
        playground: configService.get("NODE_ENV") === "development",
        introspection: configService.get("NODE_ENV") === "development",
        context: ({ req, res }) => ({ req, res }),
        formatError:
          configService.get("NODE_ENV") == "development"
            ? undefined
            : (error) => {
                return {
                  message: error.message,
                  code: error.extensions?.code,
                  path: error.path,
                };
              },
      }),
    }),

    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>("MONGODB_URI"),
        dbName: configService.get<string>("MONGODB_NAME"),
      }),
    }),

    ScheduleModule.forRoot(),

    AuthModule,
    SessionsModule,
    StorageModule,
    UsersModule,
    CoursesModule,
    ChaptersModule,
    LevelsModule,
    ProgressModule,
    AiModule,
    GameModule,
  ],
})
export class AppModule {}
