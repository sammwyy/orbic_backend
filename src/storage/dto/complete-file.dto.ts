import { Field, InputType } from "@nestjs/graphql";
import { IsArray, IsNumber, IsString, ValidateNested } from "class-validator";

@InputType()
export class FilePart {
  @Field()
  @IsString()
  etag: string;

  @Field()
  @IsNumber()
  partNumber: number;
}

@InputType()
export class CompleteFileDto {
  @Field()
  @IsString()
  fileId: string;

  @IsArray()
  @Field(() => [FilePart])
  parts: FilePart[];
}
