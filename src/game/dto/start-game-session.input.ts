import { Field, InputType } from "@nestjs/graphql";
import { IsString } from "class-validator";

@InputType()
export class StartGameSessionInput {
  @Field()
  @IsString()
  levelId: string;
}