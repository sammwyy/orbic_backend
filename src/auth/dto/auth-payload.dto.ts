import { Field, ObjectType } from "@nestjs/graphql";

import { User } from "../../users/schemas/user.schema";

@ObjectType()
export class AuthPayload {
  @Field(() => User)
  user: User;

  @Field()
  sessionId: string;

  @Field()
  accessToken: string;

  @Field()
  refreshToken: string;
}
