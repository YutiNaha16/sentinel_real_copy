import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class AddNodeDto {
  @IsString()
  @MinLength(1, { message: 'Name is required' })
  displayName!: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsEmail({}, { message: 'Email is not valid' })
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  backupId?: string;
}

export class EditNodeDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Name cannot be empty' })
  displayName?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email is not valid' })
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  backupId?: string;
}

export class MoveNodeDto {
  @IsIn(['up', 'down'])
  direction!: 'up' | 'down';
}
