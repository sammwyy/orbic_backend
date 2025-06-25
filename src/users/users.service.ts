import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import * as bcrypt from "bcryptjs";
import { Model } from "mongoose";
import { v4 as uuidv4 } from "uuid";

import { randomString } from "@/common/utils/random.utils";
import { UpdateUserInput } from "./dto/update-user.input";
import { User, UserDocument } from "./schemas/user.schema";

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(
    email: string,
    password: string,
    username: string,
    displayName?: string
  ): Promise<User> {
    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new ConflictException("Email already exists");
      }
      if (existingUser.username === username) {
        throw new ConflictException("Username already exists");
      }
    }

    const user = new this.userModel({
      email,
      password,
      displayName,
      username,
      emailVerificationCode: randomString(6),
      isEmailVerified: false,
    });

    return user.save();
  }

  async findById(id: string): Promise<User> {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return user;
  }

  async findByEmailOrUsername(emailOrUsername: string): Promise<User | null> {
    return this.userModel.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email });
  }

  async findByPasswordResetCode(code: string): Promise<User | null> {
    return this.userModel.findOne({ passwordResetCode: code });
  }

  async update(id: string, updateUserInput: UpdateUserInput): Promise<User> {
    const user = await this.userModel.findByIdAndUpdate(
      id,
      { $set: updateUserInput },
      { new: true }
    );

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  async verifyEmail(code: string): Promise<boolean> {
    const user = await this.userModel.findOne({ emailVerificationCode: code });

    if (!user) {
      throw new BadRequestException("Invalid verification code");
    }

    if (user.isEmailVerified) {
      throw new BadRequestException("Email already verified");
    }

    await this.userModel.findByIdAndUpdate(user._id, {
      $set: { isEmailVerified: true },
      $unset: { emailVerificationCode: 1 },
    });

    return true;
  }

  async requestPasswordReset(email: string): Promise<boolean> {
    const user = await this.findByEmail(email);

    if (!user) {
      // Don't reveal if email exists
      return true;
    }

    const resetCode = uuidv4();

    await this.userModel.findByIdAndUpdate(user._id, {
      $set: { passwordResetCode: resetCode },
    });

    // TODO: Send email with reset code
    console.log(`Password reset code for ${email}: ${resetCode}`);

    return true;
  }

  async resetPassword(code: string, newPassword: string): Promise<boolean> {
    const user = await this.userModel.findOne({ passwordResetCode: code });

    if (!user) {
      throw new BadRequestException("Invalid reset code");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await this.userModel.findByIdAndUpdate(user._id, {
      $set: { password: hashedPassword },
      $unset: { passwordResetCode: 1 },
    });

    return true;
  }

  async validatePassword(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}
