import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Severity } from '@prisma/client';

export class CreateIncidentDto {
  @IsString()
  @IsNotEmpty()
  typeId!: string;

  @IsOptional()
  @IsEnum(Severity)
  severity?: Severity;

  @IsOptional()
  @IsString()
  location?: string;

  @IsString()
  @IsNotEmpty({ message: 'description is required' })
  description!: string;

  @IsOptional()
  @IsBoolean()
  anonymous?: boolean;

  @IsOptional()
  @IsBoolean()
  confirmedHighSeverity?: boolean;
}
