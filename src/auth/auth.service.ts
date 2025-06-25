import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

import { JwtPayload } from "@/common/interfaces/jwt-payload.interface";
import { Types } from "mongoose";
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
    private configService: ConfigService
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

    console.log(
      `Email verification code for ${user.email}: ${user.emailVerificationCode}`
    );

    const tokens = await this.generateTokens(user, sessionInfo);

    return {
      user,
      ...tokens,
    };
  }

  async login(loginInput: LoginInput, sessionInfo?: any): Promise<AuthPayload> {
    const { emailOrUsername, password } = loginInput;

    const user = await this.usersService.findByEmailOrUsername(emailOrUsername);

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await this.usersService.validatePassword(
      password,
      user.password
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const tokens = await this.generateTokens(user, sessionInfo);

    return {
      user,
      ...tokens,
    };
  }

  async refreshToken(
    refreshToken: string,
    sessionInfo?: any
  ): Promise<AuthPayload> {
    const session = await this.sessionsService.findActiveSession(refreshToken);

    if (!session) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const user = await this.usersService.findById(session.userId);

    // Deactivate old session
    await this.sessionsService.deactivateSession(refreshToken);

    // Generate new tokens and create new session
    const tokens = await this.generateTokens(user, sessionInfo);

    return {
      user,
      ...tokens,
    };
  }

  async verifyEmail(code: string): Promise<boolean> {
    return this.usersService.verifyEmail(code);
  }

  async requestPasswordReset(email: string): Promise<boolean> {
    return this.usersService.requestPasswordReset(email);
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

  private async generateTokens(
    user: User,
    sessionInfo?: any
  ): Promise<{ accessToken: string; refreshToken: string; sessionId: string }> {
    const _id = new Types.ObjectId();
    const sessionId = _id.toString();

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
