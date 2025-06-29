import { Field, InputType } from "@nestjs/graphql";
import { IsNotEmpty, IsString } from "class-validator";

@InputType()
export class LoginInput {
  @Field()
  @IsString()
  @IsNotEmpty({ message: "Email or username is required" })
  emailOrUsername: string;

  @Field()
  @IsString()
  @IsNotEmpty({ message: "Password is required" })
  password: string;
}
