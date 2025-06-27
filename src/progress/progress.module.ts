import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { ChaptersModule } from "../chapters/chapters.module";
import { CoursesModule } from "../courses/courses.module";
import { LevelsModule } from "../levels/levels.module";
import { ProgressResolver } from "./progress.resolver";
import { ProgressService } from "./progress.service";
import {
  CourseProgress,
  CourseProgressSchema,
} from "./schemas/course-progress.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CourseProgress.name, schema: CourseProgressSchema },
    ]),
    CoursesModule,
    ChaptersModule,
    LevelsModule,
  ],
  providers: [ProgressResolver, ProgressService],
  exports: [ProgressService],
})
export class ProgressModule {}