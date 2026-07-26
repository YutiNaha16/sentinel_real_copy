import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export enum ActivateScope {
  DOWN = 'down',
  UP = 'up',
  WHOLE = 'whole',
}

export class ActivateDto {
  @IsEnum(ActivateScope)
  scope!: ActivateScope;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  message!: string;
}
