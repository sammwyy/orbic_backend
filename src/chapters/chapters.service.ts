import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CoursesService } from "../courses/courses.service";
import { CreateChapterInput } from "./dto/create-chapter.input";
import { UpdateChapterInput } from "./dto/update-chapter.input";
import { Chapter, ChapterDocument } from "./schemas/chapter.schema";

@Injectable()
export class ChaptersService {
  constructor(
    @InjectModel(Chapter.name) private chapterModel: Model<ChapterDocument>,
    private coursesService: CoursesService
  ) {}

  async create(
    createChapterInput: CreateChapterInput,
    userId: string
  ): Promise<Chapter> {
    // Verify course ownership
    const course = await this.coursesService.findById(
      createChapterInput.courseId,
      userId
    );
    if (course.author !== userId) {
      throw new ForbiddenException(
        "You can only create chapters for your own courses"
      );
    }

    // Set order if not provided
    if (!createChapterInput.order) {
      const lastChapter = await this.chapterModel
        .findOne({ courseId: createChapterInput.courseId })
        .sort({ order: -1 })
        .exec();
      createChapterInput.order = lastChapter ? lastChapter.order + 1 : 1;
    }

    const chapter = new this.chapterModel(createChapterInput);
    const savedChapter = await chapter.save();

    // Update course chapters count
    await this.updateCourseChaptersCount(createChapterInput.courseId);

    return savedChapter;
  }

  async findById(id: string, userId?: string): Promise<Chapter> {
    const chapter = await this.chapterModel.findById(id).exec();

    if (!chapter) {
      throw new NotFoundException("Chapter not found");
    }

    // Verify access to the course
    await this.coursesService.findById(chapter.courseId, userId);

    return chapter;
  }

  async update(
    id: string,
    updateChapterInput: UpdateChapterInput,
    userId: string
  ): Promise<Chapter> {
    const chapter = await this.findById(id, userId);

    // Verify course ownership
    const course = await this.coursesService.findById(chapter.courseId, userId);
    if (course.author !== userId) {
      throw new ForbiddenException(
        "You can only update chapters of your own courses"
      );
    }

    const updatedChapter = await this.chapterModel
      .findByIdAndUpdate(id, { $set: updateChapterInput }, { new: true })
      .exec();

    return updatedChapter!;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const chapter = await this.findById(id, userId);

    // Verify course ownership
    const course = await this.coursesService.findById(chapter.courseId, userId);
    if (course.author !== userId) {
      throw new ForbiddenException(
        "You can only delete chapters of your own courses"
      );
    }

    await this.chapterModel.findByIdAndDelete(id).exec();

    // Update course chapters count
    await this.updateCourseChaptersCount(chapter.courseId);

    return true;
  }

  async findCourseChapters(
    courseId: string,
    userId?: string
  ): Promise<Chapter[]> {
    // Verify access to the course
    await this.coursesService.findById(courseId, userId);

    return this.chapterModel.find({ courseId }).sort({ order: 1 }).exec();
  }

  async reorderChapters(
    courseId: string,
    chapterIds: string[],
    userId: string
  ): Promise<Chapter[]> {
    // Verify course ownership
    const course = await this.coursesService.findById(courseId, userId);
    if (course.author !== userId) {
      throw new ForbiddenException(
        "You can only reorder chapters of your own courses"
      );
    }

    // Verify all chapters belong to the course
    const chapters = await this.chapterModel
      .find({
        _id: { $in: chapterIds },
        courseId,
      })
      .exec();

    if (chapters.length !== chapterIds.length) {
      throw new BadRequestException(
        "Some chapters do not belong to this course"
      );
    }

    // Update order for each chapter
    const updatePromises = chapterIds.map((chapterId, index) =>
      this.chapterModel
        .findByIdAndUpdate(
          chapterId,
          { $set: { order: index + 1 } },
          { new: true }
        )
        .exec()
    );

    const updatedChapters = await Promise.all(updatePromises);
    return updatedChapters.filter((chapter) => chapter !== null) as Chapter[];
  }

  private async updateCourseChaptersCount(courseId: string): Promise<void> {
    const count = await this.chapterModel.countDocuments({ courseId }).exec();
    // We'll need to update the course model - this would require importing Course model
    // For now, we'll leave this as a placeholder
    console.log(`Course ${courseId} now has ${count} chapters`);
  }
}
