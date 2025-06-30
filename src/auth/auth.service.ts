import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

import { JwtPayload } from "@/common/interfaces/jwt-payload.interface";
import { Types } from "mongoose";
import { EmailService } from "../email/email.service";
import { SessionsService } from "../sessions/sessions.service";
import { User } from "../users/schemas/user.schema";
import { UsersService } from "../users/users.service";
import { AuthPayload } from "./dto/auth-payload.dto";
import { LoginInput } from "./dto/login.input";
import { RegisterUserInput } from "./dto/register-user.input";

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private sessionsService: SessionsService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService
  ) {}

  async register(
    registerUserInput: RegisterUserInput,
    sessionInfo?: any
  ): Promise<AuthPayload> {
    const user = await this.usersService.create(
      registerUserInput.email,
      registerUserInput.password,
      registerUserInput.username,
      registerUserInput.displayName
    );

    // Send email verification
    const emailSent = await this.emailService.sendEmailVerification(
      user.email,
      user.emailVerificationCode!,
      user.displayName
    );

    if (!emailSent) {
      console.log(
        `Email verification code for ${user.email}: ${user.emailVerificationCode}`
      );
    }

    const tokens = await this.createSession(user, sessionInfo);

    return {
      user,
      ...tokens,
    };
  }

  async login(loginInput: LoginInput, sessionInfo?: any): Promise<AuthPayload> {
    const { emailOrUsername, password } = loginInput;

    const user = await this.usersService.findByEmailOrUsername(emailOrUsername);

    if (!user) {
      throw new BadRequestException("Invalid credentials");
    }

    const isPasswordValid = await this.usersService.validatePassword(
      password,
      user.password
    );

    if (!isPasswordValid) {
      throw new BadRequestException("Invalid credentials");
    }

    const tokens = await this.createSession(user, sessionInfo);

    return {
      user,
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthPayload> {
    const session = await this.sessionsService.findActiveSession(refreshToken);

    if (!session) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const user = await this.usersService.findById(session.userId);

    // Generate new tokens and create new session
    const tokens = this.generateTokens(user, session._id.toString());
    session.refreshToken = tokens.refreshToken;
    await session.save();

    return {
      user,
      ...tokens,
    };
  }

  async verifyEmail(code: string): Promise<boolean> {
    return this.usersService.verifyEmail(code);
  }

  async requestPasswordReset(email: string): Promise<boolean> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      // Don't reveal if email exists
      return true;
    }

    const resetCode = await this.usersService.generatePasswordResetCode(user._id.toString());

    // Send password reset email
    const emailSent = await this.emailService.sendPasswordReset(
      user.email,
      resetCode,
      user.displayName
    );

    if (!emailSent) {
      console.log(`Password reset code for ${email}: ${resetCode}`);
    }

    return true;
  }

  async resetPassword(code: string, newPassword: string): Promise<boolean> {
    const result = await this.usersService.resetPassword(code, newPassword);

    if (result) {
      // Get user by reset code to deactivate all sessions
      const user = await this.usersService.findByPasswordResetCode(code);
      if (user) {
        await this.sessionsService.deactivateAllUserSessions(
          user._id.toString()
        );
      }
    }

    return result;
  }

  private generateTokens(user: User, sessionId: string) {
    const payload: JwtPayload = {
      sub: user._id.toString(),
      emailVerified: user.isEmailVerified,
      username: user.username,
      sessionId,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get("JWT_SECRET"),
      expiresIn: this.configService.get("JWT_EXPIRES_IN"),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get("JWT_REFRESH_SECRET"),
      expiresIn: this.configService.get("JWT_REFRESH_EXPIRES_IN"),
    });

    return { accessToken, refreshToken, sessionId };
  }

  private async createSession(
    user: User,
    sessionInfo?: any
  ): Promise<{ accessToken: string; refreshToken: string; sessionId: string }> {
    const _id = new Types.ObjectId();
    const sessionId = _id.toString();

    const { accessToken, refreshToken } = this.generateTokens(user, sessionId);

    // Create session record
    await this.sessionsService.createSession({
      _id,
      refreshToken,
      userId: user._id.toString(),
      country: sessionInfo?.country,
      browser: sessionInfo?.browser,
      os: sessionInfo?.os,
    });

    return { accessToken, refreshToken, sessionId };
  }
}