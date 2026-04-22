import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MessageAttachmentDto {
  @ApiProperty({
    description: 'Attachment id.',
    format: 'uuid',
    example: '5936fa8f-7d0c-4f60-8f39-85ea73c7fc7f',
  })
  id!: string;

  @ApiProperty({
    description: 'Relative upload path.',
    example: 'uploads/2026/04/22/abc123.webp',
  })
  path!: string;

  @ApiProperty({
    description: 'Original filename.',
    example: 'sprint-plan.pdf',
  })
  originalName!: string;

  @ApiProperty({
    description: 'MIME type.',
    example: 'application/pdf',
  })
  mimeType!: string;

  @ApiProperty({
    description: 'Size in bytes.',
    example: 120304,
  })
  size!: number;

  @ApiProperty({
    description: 'Display sort order.',
    example: 0,
  })
  sortOrder!: number;

  @ApiPropertyOptional({
    description: 'Image width in pixels.',
    example: 1280,
  })
  width?: number | null;

  @ApiPropertyOptional({
    description: 'Image height in pixels.',
    example: 720,
  })
  height?: number | null;

  @ApiPropertyOptional({
    description: 'Media duration in ms.',
    example: 15000,
  })
  durationMs?: number | null;
}
