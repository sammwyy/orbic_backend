import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";

import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { GqlAuthGuard } from "@/common/guards/gql-auth.guard";
import { JwtPayload } from "@/common/interfaces/jwt-payload.interface";
import { AiService } from "./ai.service";
import { CourseGenerationStatus } from "./dto/course-generation-status.dto";
import { GenerateCourseFromFileInput } from "./dto/generate-course-from-file.input";
import { GenerateCourseFromTextInput } from "./dto/generate-course-from-text.input";
import { GeneratedCoursePreview } from "./dto/generated-course-preview.dto";

@Resolver()
@UseGuards(GqlAuthGuard)
export class AiResolver {
  constructor(private readonly aiService: AiService) {}

  @Mutation(() => String)
  async generateCourseFromFile(
    @Args("input") input: GenerateCourseFromFileInput,
    @CurrentUser() user: JwtPayload
  ): Promise<string> {
    return this.aiService.generateCourseFromFile(input, user.sub);
  }

  @Mutation(() => String)
  async generateCourseFromText(
    @Args("input") input: GenerateCourseFromTextInput,
    @CurrentUser() user: JwtPayload
  ): Promise<string> {
    return this.aiService.generateCourseFromText(input, user.sub);
  }

  @Query(() => CourseGenerationStatus)
  async getCourseGenerationStatus(
    @Args("jobId") jobId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<CourseGenerationStatus> {
    return this.aiService.getCourseGenerationStatus(jobId, user.sub);
  }

  @Query(() => GeneratedCoursePreview)
  async previewGeneratedCourse(
    @Args("jobId") jobId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<GeneratedCoursePreview> {
    return this.aiService.previewGeneratedCourse(jobId, user.sub);
  }
}
