import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ChaptersModule } from "../chapters/chapters.module";
import { CoursesModule } from "../courses/courses.module";
import { LevelsResolver } from "./levels.resolver";
import { LevelsService } from "./levels.service";
import { Level, LevelSchema } from "./schemas/level.schema";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Level.name, schema: LevelSchema }]),
    CoursesModule,
    ChaptersModule,
  ],
  providers: [LevelsResolver, LevelsService],
  exports: [LevelsService],
})
export class LevelsModule {}
