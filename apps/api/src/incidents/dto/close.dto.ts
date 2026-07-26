import { IsNotEmpty, IsString } from 'class-validator';

export class CloseDto {
  @IsString()
  @IsNotEmpty({ message: 'A reason is required to close' })
  reason!: string;
}
