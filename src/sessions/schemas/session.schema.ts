import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SessionDocument = Session & Document;

@Schema({ timestamps: true })
export class Session {
  @Prop({ required: true })
  refreshToken: string;

  @Prop({ type: String, ref: 'User', required: true })
  userId: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;

  @Prop()
  country?: string;

  @Prop()
  browser?: string;

  @Prop()
  os?: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const SessionSchema = SchemaFactory.createForClass(Session);

// Add indexes
SessionSchema.index({ refreshToken: 1 });
SessionSchema.index({ userId: 1 });
SessionSchema.index({ isActive: 1 });
SessionSchema.index({ createdAt: 1 });