import { ApiProperty } from '@nestjs/swagger';

export class DeleteMessageResponseDto {
  @ApiProperty({
    description: 'Operation success flag.',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Deleted message id.',
    format: 'uuid',
    example: '7f42fd18-fb42-4f08-aad2-e81f9f8688af',
  })
  messageId!: string;
}
