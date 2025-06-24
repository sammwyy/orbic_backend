import { UseGuards } from "@nestjs/common";
import { Args, Mutation, Query, Resolver } from "@nestjs/graphql";

import { JwtPayload } from "@/common/interfaces/jwt-payload.interface";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { GqlAuthGuard } from "../common/guards/gql-auth.guard";
import { UpdateUserInput } from "./dto/update-user.input";
import { User } from "./schemas/user.schema";
import { UsersService } from "./users.service";

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => User, { name: "me" })
  @UseGuards(GqlAuthGuard)
  async getMe(@CurrentUser() user: JwtPayload): Promise<User> {
    return this.usersService.findById(user.sub);
  }

  @Mutation(() => User)
  @UseGuards(GqlAuthGuard)
  async updateProfile(
    @CurrentUser() user: JwtPayload,
    @Args("input") updateUserInput: UpdateUserInput
  ): Promise<User> {
    return this.usersService.update(user.sub, updateUserInput);
  }
}
