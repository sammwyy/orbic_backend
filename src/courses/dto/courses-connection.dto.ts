import { Field, Int, ObjectType } from "@nestjs/graphql";
import { Course } from "../schemas/course.schema";

@ObjectType()
export class CoursesConnection {
  @Field(() => [Course])
  courses: Course[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  limit: number;

  @Field(() => Int)
  offset: number;

  @Field()
  hasMore: boolean;
}
