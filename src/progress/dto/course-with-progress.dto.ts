import { Field, ObjectType } from "@nestjs/graphql";
import { Course } from "../../courses/schemas/course.schema";
import { CourseProgress } from "../schemas/course-progress.schema";

@ObjectType()
export class CourseWithProgress {
  @Field(() => Course)
  course: Course;

  @Field(() => CourseProgress)
  progress: CourseProgress;
}