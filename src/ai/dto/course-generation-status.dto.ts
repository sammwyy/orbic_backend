import { Field, ObjectType } from "@nestjs/graphql";

import { GenerationJobStatus } from "../schemas/generation-job.schema";

@ObjectType()
export class CourseGenerationStatus {
  @Field()
  jobId: string;

  @Field()
  status: GenerationJobStatus;

  @Field()
  progress: number;

  @Field({ nullable: true })
  message?: string;

  @Field({ nullable: true })
  courseId?: string;

  @Field()
  createdAt: Date;

  @Field({ nullable: true })
  completedAt?: Date;

  @Field({ nullable: true })
  error?: string;
}
