import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { ChaptersModule } from "../chapters/chapters.module";
import { CoursesModule } from "../courses/courses.module";
import { LevelsModule } from "../levels/levels.module";
import { StorageModule } from "../storage/storage.module";
import { AiResolver } from "./ai.resolver";
import { AiService } from "./ai.service";
import {
  GenerationJob,
  GenerationJobSchema,
} from "./schemas/generation-job.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GenerationJob.name, schema: GenerationJobSchema },
    ]),
    StorageModule,
    CoursesModule,
    ChaptersModule,
    LevelsModule,
  ],
  providers: [AiService, AiResolver],
  exports: [AiService],
})
export class AiModule {}
