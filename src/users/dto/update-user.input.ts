import { InputType, Field } from '@nestjs/graphql';
import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

@InputType()
export class UpdateUserInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Display name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Display name must not exceed 50 characters' })
  displayName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  avatarId?: string;
}