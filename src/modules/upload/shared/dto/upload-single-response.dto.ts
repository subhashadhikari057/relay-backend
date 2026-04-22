import { ApiProperty } from '@nestjs/swagger';
import { UploadFileItemDto } from './upload-file-item.dto';

export class UploadSingleResponseDto {
  @ApiProperty({
    description: 'Uploaded file metadata.',
    type: UploadFileItemDto,
  })
  file!: UploadFileItemDto;
}
