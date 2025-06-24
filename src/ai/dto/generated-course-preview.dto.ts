import { Field, ObjectType } from "@nestjs/graphql";
import { Chapter } from "../../chapters/schemas/chapter.schema";
import { Course } from "../../courses/schemas/course.schema";
import { Level } from "../../levels/schemas/level.schema";

@ObjectType()
export class GeneratedCoursePreview {
  @Field(() => Course)
  course: Course;

  @Field()
  chapterCount: number;

  @Field(() => [Chapter])
  sampleChapters: Chapter[];

  @Field(() => Level, { nullable: true })
  sampleLevel?: Level;
}
