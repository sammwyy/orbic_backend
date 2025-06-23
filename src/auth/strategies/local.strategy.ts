import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';

import { AuthService } from '../auth.service';
import { User } from '../../users/schemas/user.schema';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'emailOrUsername',
    });
  }

  async validate(emailOrUsername: string, password: string): Promise<User> {
    const result = await this.authService.login({ emailOrUsername, password });
    
    if (!result) {
      throw new UnauthorizedException();
    }
    
    return result.user;
  }
}