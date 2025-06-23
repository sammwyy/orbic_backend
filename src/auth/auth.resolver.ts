import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';

import { AuthService } from './auth.service';
import { CreateUserInput } from '../users/dto/create-user.input';
import { LoginInput } from '../users/dto/login.input';
import { AuthPayload } from '../users/dto/auth-payload.dto';

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Mutation(() => AuthPayload)
  async register(
    @Args('input') createUserInput: CreateUserInput,
    @Context() context: any,
  ): Promise<AuthPayload> {
    const sessionInfo = this.extractSessionInfo(context);
    return this.authService.register(createUserInput, sessionInfo);
  }

  @Mutation(() => AuthPayload)
  async login(
    @Args('input') loginInput: LoginInput,
    @Context() context: any,
  ): Promise<AuthPayload> {
    const sessionInfo = this.extractSessionInfo(context);
    return this.authService.login(loginInput, sessionInfo);
  }

  @Mutation(() => AuthPayload)
  async refreshToken(
    @Args('refreshToken') refreshToken: string,
    @Context() context: any,
  ): Promise<AuthPayload> {
    const sessionInfo = this.extractSessionInfo(context);
    return this.authService.refreshToken(refreshToken, sessionInfo);
  }

  @Mutation(() => Boolean)
  async logout(@Args('refreshToken') refreshToken: string): Promise<boolean> {
    return this.authService.logout(refreshToken);
  }

  @Mutation(() => Boolean)
  async logoutAllSessions(@Args('userId') userId: string): Promise<boolean> {
    return this.authService.logoutAllSessions(userId);
  }

  @Mutation(() => Boolean)
  async verifyEmail(@Args('code') code: string): Promise<boolean> {
    return this.authService.verifyEmail(code);
  }

  @Mutation(() => Boolean)
  async requestPasswordReset(@Args('email') email: string): Promise<boolean> {
    return this.authService.requestPasswordReset(email);
  }

  @Mutation(() => Boolean)
  async resetPassword(
    @Args('code') code: string,
    @Args('newPassword') newPassword: string,
  ): Promise<boolean> {
    return this.authService.resetPassword(code, newPassword);
  }

  private extractSessionInfo(context: any) {
    const req = context.req;
    const userAgent = req.headers['user-agent'] || '';
    const country = req.headers['cf-ipcountry'] || req.headers['x-country'] || undefined;
    
    // Simple user agent parsing (you might want to use a library like 'ua-parser-js')
    const browser = this.parseBrowser(userAgent);
    const os = this.parseOS(userAgent);

    return {
      country,
      browser,
      os,
    };
  }

  private parseBrowser(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private parseOS(userAgent: string): string {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac OS')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
  }
}