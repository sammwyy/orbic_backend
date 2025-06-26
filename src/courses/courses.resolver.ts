import { UseGuards } from "@nestjs/common";
import { Args, ID, Int, Mutation, Query, Resolver } from "@nestjs/graphql";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { GqlAuthGuard } from "../common/guards/gql-auth.guard";
import { JwtPayload } from "../common/interfaces/jwt-payload.interface";
import { CoursesService } from "./courses.service";
import { CourseFilterInput } from "./dto/course-filter.input";
import { CoursesConnection } from "./dto/courses-connection.dto";
import { CreateCourseInput } from "./dto/create-course.input";
import { UpdateCourseInput } from "./dto/update-course.input";
import { Course, CourseVisibility } from "./schemas/course.schema";

@Resolver(() => Course)
@UseGuards(GqlAuthGuard)
export class CoursesResolver {
  constructor(private readonly coursesService: CoursesService) {}

  @Mutation(() => Course)
  async createCourse(
    @Args("input") createCourseInput: CreateCourseInput,
    @CurrentUser() user: JwtPayload
  ): Promise<Course> {
    return this.coursesService.create(createCourseInput, user.sub);
  }

  @Mutation(() => Course)
  async updateCourse(
    @Args("id", { type: () => ID }) id: string,
    @Args("input") updateCourseInput: UpdateCourseInput,
    @CurrentUser() user: JwtPayload
  ): Promise<Course> {
    return this.coursesService.update(id, updateCourseInput, user.sub);
  }

  @Mutation(() => Course)
  async updateCourseVisibility(
    @Args("id", { type: () => ID }) id: string,
    @Args("visibility", { type: () => CourseVisibility })
    visibility: CourseVisibility,
    @CurrentUser() user: JwtPayload
  ): Promise<Course> {
    return this.coursesService.updateVisibility(id, visibility, user.sub);
  }

  @Mutation(() => Boolean)
  async deleteCourse(
    @Args("id", { type: () => ID }) id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<boolean> {
    return this.coursesService.delete(id, user.sub);
  }

  @Query(() => Course, { nullable: true })
  async course(
    @Args("id", { type: () => ID }) id: string,
    @CurrentUser() user?: JwtPayload
  ): Promise<Course> {
    return this.coursesService.findById(id, user?.sub);
  }

  @Query(() => CoursesConnection)
  async courses(
    @Args("filter", { nullable: true }) filter?: CourseFilterInput,
    @Args("limit", { type: () => Int, nullable: true, defaultValue: 20 })
    limit?: number,
    @Args("offset", { type: () => Int, nullable: true, defaultValue: 0 })
    offset?: number,
    @CurrentUser() user?: JwtPayload
  ): Promise<CoursesConnection> {
    return this.coursesService.findCourses(filter, limit, offset, user?.sub);
  }

  @Query(() => CoursesConnection)
  async myCourses(
    @Args("limit", { type: () => Int, nullable: true, defaultValue: 20 })
    limit?: number,
    @Args("offset", { type: () => Int, nullable: true, defaultValue: 0 })
    offset?: number,
    @CurrentUser() user?: JwtPayload
  ): Promise<CoursesConnection> {
    return this.coursesService.findMyCourses(user!.sub, limit, offset);
  }

  @Query(() => CoursesConnection)
  async publicCourses(
    @Args("limit", { type: () => Int, nullable: true, defaultValue: 20 })
    limit?: number,
    @Args("offset", { type: () => Int, nullable: true, defaultValue: 0 })
    offset?: number
  ): Promise<CoursesConnection> {
    return this.coursesService.findPublicCourses(limit, offset);
  }
}
