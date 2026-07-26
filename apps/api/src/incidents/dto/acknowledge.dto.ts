import { IsNotEmpty, IsString } from 'class-validator';

export class AcknowledgeDto {
  @IsString()
  @IsNotEmpty()
  nodeId!: string;
}
