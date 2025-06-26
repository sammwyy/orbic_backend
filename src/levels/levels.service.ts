import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { validateQuestions } from "@/common/utils/question.utils";
import { CourseVisibility } from "@/courses/schemas/course.schema";
import { ChaptersService } from "../chapters/chapters.service";
import { CoursesService } from "../courses/courses.service";
import { CreateLevelInput } from "./dto/create-level.input";
import { UpdateLevelInput } from "./dto/update-level.input";
import { Level, LevelDocument } from "./schemas/level.schema";

@Injectable()
export class LevelsService {
  constructor(
    @InjectModel(Level.name) private levelModel: Model<LevelDocument>,
    private coursesService: CoursesService,
    private chaptersService: ChaptersService
  ) {}

  async create(
    createLevelInput: CreateLevelInput,
    userId: string
  ): Promise<Level> {
    // Verify course and chapter ownership
    const course = await this.coursesService.findById(
      createLevelInput.courseId,
      userId
    );

    if (course.author !== userId) {
      throw new ForbiddenException(
        "You can only create levels for your own courses"
      );
    }

    const chapter = await this.chaptersService.findById(
      createLevelInput.chapterId,
      userId
    );
    if (chapter.courseId !== createLevelInput.courseId) {
      throw new BadRequestException(
        "Chapter does not belong to the specified course"
      );
    }

    // Validate questions if provided
    if (createLevelInput.questions) {
      validateQuestions(createLevelInput.questions);
    }

    // Set order if not provided
    if (!createLevelInput.order) {
      const lastLevel = await this.levelModel
        .findOne({ chapterId: createLevelInput.chapterId })
        .sort({ order: -1 })
        .exec();
      createLevelInput.order = lastLevel ? lastLevel.order + 1 : 1;
    }

    const level = new this.levelModel({
      ...createLevelInput,
      questions: createLevelInput.questions || [],
    });

    const savedLevel = await level.save();

    // Update chapter levels count
    await this.updateChapterLevelsCount(createLevelInput.chapterId);

    return savedLevel;
  }

  async findById(id: string, userId?: string): Promise<Level> {
    const level = await this.levelModel.findById(id).exec();

    if (!level) {
      throw new NotFoundException("Level not found");
    }

    // Verify access to the course
    await this.coursesService.findById(level.courseId, userId);

    return level;
  }

  async update(
    id: string,
    updateLevelInput: UpdateLevelInput,
    userId: string
  ): Promise<Level> {
    const level = await this.findById(id, userId);

    // Verify course ownership
    const course = await this.coursesService.findById(level.courseId, userId);
    if (course.author !== userId) {
      throw new ForbiddenException(
        "You can only update levels of your own courses"
      );
    }

    // Validate questions if provided
    if (updateLevelInput.questions) {
      validateQuestions(updateLevelInput.questions);
    }

    const updatedLevel = await this.levelModel
      .findByIdAndUpdate(id, { $set: updateLevelInput }, { new: true })
      .exec();

    return updatedLevel!;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const level = await this.findById(id, userId);

    // Verify course ownership
    const course = await this.coursesService.findById(level.courseId, userId);
    if (course.author !== userId) {
      throw new ForbiddenException(
        "You can only delete levels of your own courses"
      );
    }

    await this.levelModel.findByIdAndDelete(id).exec();

    // Update chapter levels count
    await this.updateChapterLevelsCount(level.chapterId);

    return true;
  }

  async findChapterLevels(
    chapterId: string,
    userId?: string
  ): Promise<Level[]> {
    const chapter = await this.chaptersService.findById(chapterId, userId);
    const course = await this.coursesService.findById(chapter.courseId);

    if (
      userId !== undefined &&
      course.visibility == CourseVisibility.PRIVATE &&
      course.author !== userId
    ) {
      throw new UnauthorizedException("Don't have access to this course");
    }

    return this.levelModel.find({ chapterId }).sort({ order: 1 }).exec();
  }

  async findCourseLevels(courseId: string, userId?: string) {
    const course = await this.coursesService.findById(courseId, userId);
    return this.levelModel
      .find({ courseId: course._id })
      .sort({ order: 1 })
      .exec();
  }

  async reorderLevels(
    chapterId: string,
    levelIds: string[],
    userId: string
  ): Promise<Level[]> {
    // Todo: Verify chapter and course ownership
    const chapter = await this.chaptersService.findById(chapterId, userId);
    const course = await this.coursesService.findById(chapter.courseId, userId);
    if (course.author !== userId) {
      throw new ForbiddenException(
        "You can only reorder levels of your own courses"
      );
    }

    // Verify all levels belong to the chapter
    const levels = await this.levelModel
      .find({
        _id: { $in: levelIds },
        chapterId,
      })
      .exec();

    if (levels.length !== levelIds.length) {
      throw new BadRequestException(
        "Some levels do not belong to this chapter"
      );
    }

    // Update order for each level
    const updatePromises = levelIds.map((levelId, index) =>
      this.levelModel
        .findByIdAndUpdate(
          levelId,
          { $set: { order: index + 1 } },
          { new: true }
        )
        .exec()
    );

    const updatedLevels = await Promise.all(updatePromises);
    return updatedLevels.filter((level) => level !== null) as Level[];
  }

  private async updateChapterLevelsCount(chapterId: string): Promise<void> {
    const count = await this.levelModel.countDocuments({ chapterId }).exec();
    // Todo: We'll need to update the chapter model - this would require importing Chapter model. For now, we'll leave this as a placeholder
    console.log(`Chapter ${chapterId} now has ${count} levels`);
  }
}
