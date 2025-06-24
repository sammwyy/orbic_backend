import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type GenerationJobDocument = GenerationJob & Document;

export enum GenerationJobStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

@Schema({ timestamps: true })
export class GenerationJob {
  @Prop({ required: true })
  _id: string;

  @Prop({ required: true })
  userId: string;

  @Prop()
  fileId?: string;

  @Prop()
  content?: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  category: string;

  @Prop({ required: true })
  lang: string;

  @Prop({
    required: true,
    enum: Object.values(GenerationJobStatus),
    default: GenerationJobStatus.PENDING,
  })
  status: GenerationJobStatus;

  @Prop({ default: 0 })
  progress: number;

  @Prop()
  message?: string;

  @Prop()
  error?: string;

  @Prop()
  courseId?: string;

  @Prop({ required: true })
  createdAt: Date;

  @Prop()
  completedAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const GenerationJobSchema = SchemaFactory.createForClass(GenerationJob);

// Add indexes
GenerationJobSchema.index({ userId: 1 });
GenerationJobSchema.index({ status: 1 });
GenerationJobSchema.index({ createdAt: 1 });
