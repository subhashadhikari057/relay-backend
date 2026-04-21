import { ApiPropertyOptional } from '@nestjs/swagger';

export class UploadContextResponseDto {
  @ApiPropertyOptional({
    description: 'Workspace context echoed from upload request.',
    example: '01968c8b-a4fc-7a08-b3d2-4e69ec7fcbf3',
  })
  workspaceId?: string;

  @ApiPropertyOptional({
    description: 'Channel context echoed from upload request.',
    example: '01968c93-2ee0-7fef-a798-afbaf289ad26',
  })
  channelId?: string;

  @ApiPropertyOptional({
    description: 'Message context echoed from upload request.',
    example: '01968c95-9999-7ad8-a98e-aa11bb22cc33',
  })
  messageId?: string;
}
