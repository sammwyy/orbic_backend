import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CoursesModule } from "../courses/courses.module";
import { ChaptersResolver } from "./chapters.resolver";
import { ChaptersService } from "./chapters.service";
import { Chapter, ChapterSchema } from "./schemas/chapter.schema";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Chapter.name, schema: ChapterSchema }]),
    CoursesModule,
  ],
  providers: [ChaptersResolver, ChaptersService],
  exports: [ChaptersService],
})
export class ChaptersModule {}
