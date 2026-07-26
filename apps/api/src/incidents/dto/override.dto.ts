import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { Severity } from '@prisma/client';

export class OverrideDto {
  @IsEnum(Severity)
  severity!: Severity;

  @IsString()
  @IsNotEmpty({ message: 'A reason is required to override' })
  reason!: string;
}
