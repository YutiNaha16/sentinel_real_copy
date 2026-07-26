import { IsNotEmpty, IsString } from 'class-validator';

export class UploadCsvDto {
  @IsString()
  @IsNotEmpty({ message: 'CSV content is required' })
  csv!: string;
}
