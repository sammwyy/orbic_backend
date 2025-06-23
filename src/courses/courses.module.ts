import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { StorageModule } from "../storage/storage.module";
import { CoursesResolver } from "./courses.resolver";
import { CoursesService } from "./courses.service";
import { Course, CourseSchema } from "./schemas/course.schema";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Course.name, schema: CourseSchema }]),
    StorageModule,
  ],
  providers: [CoursesResolver, CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
