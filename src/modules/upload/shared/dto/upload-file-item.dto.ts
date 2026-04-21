import { ApiProperty } from '@nestjs/swagger';
import { UploadContextResponseDto } from './upload-context-response.dto';

export class UploadFileItemDto {
  @ApiProperty({
    description: 'Relative file path from project root.',
    example: 'uploads/2026/04/22/a3fe8d3f-f1a2-4f31-bf7f-c0f5b9a1d2e8.jpg',
  })
  path!: string;

  @ApiProperty({
    description: 'Stored file name.',
    example: 'a3fe8d3f-f1a2-4f31-bf7f-c0f5b9a1d2e8.jpg',
  })
  fileName!: string;

  @ApiProperty({
    description: 'Original uploaded file name.',
    example: 'vacation.png',
  })
  originalName!: string;

  @ApiProperty({
    description: 'Resolved MIME type of stored file.',
    example: 'image/jpeg',
  })
  mimeType!: string;

  @ApiProperty({
    description: 'Stored file size in bytes.',
    example: 145623,
  })
  size!: number;

  @ApiProperty({
    description: 'Whether optimization was applied.',
    example: true,
  })
  optimized!: boolean;

  @ApiProperty({
    description: 'Optional upload context metadata.',
    type: UploadContextResponseDto,
  })
  context!: UploadContextResponseDto;
}
