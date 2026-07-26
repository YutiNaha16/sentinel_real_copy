import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Severity } from '@prisma/client';

export class EscalationLevelDto {
  @IsEnum(Severity)
  severity!: Severity;

  @IsInt()
  @IsPositive()
  escalateAfterSec!: number;

  @IsInt()
  @IsPositive()
  remindEverySec!: number;

  @IsInt()
  @IsPositive()
  maxReminders!: number;

  @IsInt()
  @IsPositive()
  adminAlarmAfterSec!: number;
}

export class UpdateEscalationDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EscalationLevelDto)
  levels!: EscalationLevelDto[];
}

export class MappingItemDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsEnum(Severity)
  defaultSeverity!: Severity;
}

export class UpdateMappingDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MappingItemDto)
  mapping!: MappingItemDto[];
}

export class UpdateGeneralDto {
  @IsInt()
  @IsPositive()
  reopenWindowHours!: number;

  @IsInt()
  @Min(18, { message: 'retentionMonths must be at least 18' })
  retentionMonths!: number;
}
