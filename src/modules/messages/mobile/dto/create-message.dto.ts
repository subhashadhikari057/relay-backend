import { MessageType } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import { MessageAttachmentInputDto } from './message-attachment-input.dto';

export class CreateMessageDto {
  @ApiPropertyOptional({
    description: 'Message type. `system` is reserved for backend flows.',
    enum: MessageType,
    default: MessageType.text,
    example: MessageType.text,
  })
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @ApiPropertyOptional({
    description: 'Message content text.',
    example: 'Hey team, sprint planning at 5 PM.',
    maxLength: 10000,
  })
  @IsOptional()
  @IsString()
  @Length(1, 10000)
  content?: string;

  @ApiPropertyOptional({
    description: 'Optional metadata JSON payload.',
    example: {
      mentionUserIds: ['4356b7ac-679b-4021-9ed8-a912624a3d8f'],
      clientMessageId: 'tmp_123',
    },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description:
      'Attachment list created from upload responses. Required when type=file.',
    type: [MessageAttachmentInputDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageAttachmentInputDto)
  attachments?: MessageAttachmentInputDto[];
}
