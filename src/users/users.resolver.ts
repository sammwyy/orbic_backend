import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';

import { UsersService } from './users.service';
import { User } from './schemas/user.schema';
import { UpdateUserInput } from './dto/update-user.input';
import { GqlAuthGuard } from '../common/guards/gql-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => User, { name: 'me' })
  @UseGuards(GqlAuthGuard)
  async getMe(@CurrentUser() user: User): Promise<User> {
    return this.usersService.findById(user._id.toString());
  }

  @Mutation(() => User)
  @UseGuards(GqlAuthGuard)
  async updateProfile(
    @CurrentUser() user: User,
    @Args('input') updateUserInput: UpdateUserInput,
  ): Promise<User> {
    return this.usersService.update(user._id.toString(), updateUserInput);
  }
}