import { Field, ID, ObjectType } from "@nestjs/graphql";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import * as bcrypt from "bcryptjs";
import { Document, Types } from "mongoose";

export type UserDocument = User & Document;

@Schema({ timestamps: true })
@ObjectType()
export class User {
  @Field(() => ID)
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true })
  @Field()
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  @Field()
  displayName: string;

  @Prop({ required: true, unique: true })
  @Field()
  username: string;

  @Prop()
  @Field({ nullable: true })
  avatarId?: string;

  @Prop()
  emailVerificationCode?: string;

  @Prop()
  emailChangeNewEmail?: string;

  @Prop()
  emailChangeVerificationCode?: string;

  @Prop()
  passwordResetCode?: string;

  @Prop({ default: false })
  @Field()
  isEmailVerified: boolean;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Add indexes
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ emailVerificationCode: 1 });
UserSchema.index({ passwordResetCode: 1 });

// Add user save hook to encrypt password
UserSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});
