import { ApiProperty } from '@nestjs/swagger';
import { UploadContextDto } from './upload-context.dto';

export class UploadSingleRequestDto extends UploadContextDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Single file to upload.',
  })
  file!: unknown;
}
