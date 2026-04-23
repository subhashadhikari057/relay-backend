import { ApiProperty } from '@nestjs/swagger';

export class MarkDirectConversationReadResponseDto {
  @ApiProperty({
    description: 'Whether the DM read pointer update succeeded.',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Persisted last read message id.',
    format: 'uuid',
    example: '7f42fd18-fb42-4f08-aad2-e81f9f8688af',
  })
  lastReadMessageId!: string;

  @ApiProperty({
    description: 'Timestamp when read pointer was updated.',
    type: String,
    format: 'date-time',
    example: '2026-04-23T08:15:00.000Z',
  })
  lastReadAt!: Date;
}
