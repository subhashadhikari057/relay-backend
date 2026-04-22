import { ApiProperty } from '@nestjs/swagger';
import { UploadContextDto } from './upload-context.dto';

export class UploadMultipleRequestDto extends UploadContextDto {
  @ApiProperty({
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
    description: 'Multiple files to upload.',
  })
  files!: unknown[];
}
