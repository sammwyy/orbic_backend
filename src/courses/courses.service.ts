import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { StorageService } from "../storage/storage.service";
import { CourseFilterInput } from "./dto/course-filter.input";
import { CoursesConnection } from "./dto/courses-connection.dto";
import { CreateCourseInput } from "./dto/create-course.input";
import { UpdateCourseInput } from "./dto/update-course.input";
import {
  Course,
  CourseDocument,
  CourseVisibility,
} from "./schemas/course.schema";

@Injectable()
export class CoursesService {
  constructor(
    @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
    private storageService: StorageService
  ) {}

  async create(
    createCourseInput: CreateCourseInput,
    userId: string
  ): Promise<Course> {
    // Validate thumbnail and banner files if provided
    if (createCourseInput.thumbnailId) {
      await this.validateImageFile(createCourseInput.thumbnailId, userId);
    }
    if (createCourseInput.bannerId) {
      await this.validateImageFile(createCourseInput.bannerId, userId);
    }

    const course = new this.courseModel({
      ...createCourseInput,
      author: userId,
      visibility: createCourseInput.visibility || CourseVisibility.PRIVATE,
    });

    return course.save();
  }

  async findById(id: string, userId?: string): Promise<Course> {
    const course = await this.courseModel.findById(id).exec();

    if (!course) {
      throw new NotFoundException("Course not found");
    }

    // Check access permissions
    if (!this.canAccessCourse(course, userId)) {
      throw new ForbiddenException("Access denied to this course");
    }

    return course;
  }

  async update(
    id: string,
    updateCourseInput: UpdateCourseInput,
    userId: string
  ): Promise<Course> {
    const course = await this.courseModel.findById(id).exec();

    if (!course) {
      throw new NotFoundException("Course not found");
    }

    if (course.author !== userId) {
      throw new ForbiddenException("You can only update your own courses");
    }

    // Validate new image files if provided
    if (updateCourseInput.thumbnailId) {
      await this.validateImageFile(updateCourseInput.thumbnailId, userId);
    }
    if (updateCourseInput.bannerId) {
      await this.validateImageFile(updateCourseInput.bannerId, userId);
    }

    const updatedCourse = await this.courseModel
      .findByIdAndUpdate(id, { $set: updateCourseInput }, { new: true })
      .exec();

    return updatedCourse!;
  }

  async updateVisibility(
    id: string,
    visibility: CourseVisibility,
    userId: string
  ): Promise<Course> {
    const course = await this.courseModel.findById(id).exec();

    if (!course) {
      throw new NotFoundException("Course not found");
    }

    if (course.author !== userId) {
      throw new ForbiddenException("You can only update your own courses");
    }

    const updatedCourse = await this.courseModel
      .findByIdAndUpdate(id, { $set: { visibility } }, { new: true })
      .exec();

    return updatedCourse!;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const course = await this.courseModel.findById(id).exec();

    if (!course) {
      throw new NotFoundException("Course not found");
    }

    if (course.author !== userId) {
      throw new ForbiddenException("You can only delete your own courses");
    }

    // Delete associated files
    try {
      if (course.thumbnailId) {
        await this.storageService.deleteFile(course.thumbnailId, userId);
      }
      if (course.bannerId) {
        await this.storageService.deleteFile(course.bannerId, userId);
      }
    } catch (error) {
      // Log error but don't fail the course deletion
      console.error("Error deleting course files:", error);
    }

    await this.courseModel.findByIdAndDelete(id).exec();
    return true;
  }

  async findCourses(
    filter: CourseFilterInput = {},
    limit: number = 20,
    offset: number = 0,
    userId?: string
  ): Promise<CoursesConnection> {
    const query: any = {};

    // Build query based on filters
    if (filter.search) {
      query.$text = { $search: filter.search };
    }

    if (filter.category) {
      query.category = filter.category;
    }

    if (filter.author) {
      query.author = filter.author;
    }

    if (filter.lang) {
      query.lang = filter.lang;
    }

    // Handle visibility filtering
    if (filter.visibility) {
      query.visibility = filter.visibility;
    } else {
      // Default: show public and approved courses, plus user's own courses
      if (userId) {
        query.$or = [
          { visibility: CourseVisibility.PUBLIC, isApproved: true },
          { visibility: CourseVisibility.LINK_ONLY },
          { author: userId },
        ];
      } else {
        query.visibility = CourseVisibility.PUBLIC;
        query.isApproved = true;
      }
    }

    const [courses, total] = await Promise.all([
      this.courseModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .exec(),
      this.courseModel.countDocuments(query).exec(),
    ]);

    return {
      courses,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };
  }

  async findMyCourses(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<CoursesConnection> {
    const query = { author: userId };

    const [courses, total] = await Promise.all([
      this.courseModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .exec(),
      this.courseModel.countDocuments(query).exec(),
    ]);

    return {
      courses,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };
  }

  async findPublicCourses(
    limit: number = 20,
    offset: number = 0
  ): Promise<CoursesConnection> {
    const query = {
      visibility: CourseVisibility.PUBLIC,
      isApproved: true,
    };

    const [courses, total] = await Promise.all([
      this.courseModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .exec(),
      this.courseModel.countDocuments(query).exec(),
    ]);

    return {
      courses,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };
  }

  private canAccessCourse(course: Course, userId?: string): boolean {
    // Author can always access their course
    if (userId && course.author === userId) {
      return true;
    }

    // Public courses are accessible to everyone (if approved)
    if (course.visibility === CourseVisibility.PUBLIC && course.isApproved) {
      return true;
    }

    // Link-only courses are accessible with direct link
    if (course.visibility === CourseVisibility.LINK_ONLY) {
      return true;
    }

    // Private courses only accessible to author
    return false;
  }

  private async validateImageFile(
    fileId: string,
    userId: string
  ): Promise<void> {
    try {
      const file = await this.storageService.getFileById(fileId, userId);

      const allowedImageTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ];

      if (!allowedImageTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          "File must be an image (JPEG, PNG, GIF, or WebP)"
        );
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new BadRequestException("Invalid file ID provided");
      }
      throw error;
    }
  }
}
