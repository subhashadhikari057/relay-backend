import { ApiProperty } from '@nestjs/swagger';
import { UploadFileItemDto } from './upload-file-item.dto';

export class UploadMultipleResponseDto {
  @ApiProperty({
    description: 'Number of files uploaded.',
    example: 2,
  })
  count!: number;

  @ApiProperty({
    description: 'Uploaded file metadata list.',
    type: UploadFileItemDto,
    isArray: true,
  })
  files!: UploadFileItemDto[];
}
