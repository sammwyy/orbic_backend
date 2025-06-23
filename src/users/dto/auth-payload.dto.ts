import { ObjectType, Field } from '@nestjs/graphql';
import { User } from '../schemas/user.schema';

@ObjectType()
export class AuthPayload {
  @Field(() => User)
  user: User;

  @Field()
  accessToken: string;

  @Field()
  refreshToken: string;
}