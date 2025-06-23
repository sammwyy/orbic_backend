import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';

@InputType()
export class CreateUserInput {
  @Field()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @Field()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    { message: 'Password must contain uppercase, lowercase, number and special character' }
  )
  password: string;

  @Field()
  @IsString()
  @MinLength(2, { message: 'Display name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Display name must not exceed 50 characters' })
  displayName: string;

  @Field()
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(30, { message: 'Username must not exceed 30 characters' })
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Username can only contain letters, numbers and underscores' })
  username: string;
}