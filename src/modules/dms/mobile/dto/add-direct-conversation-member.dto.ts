import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AddDirectConversationMemberDto {
  @ApiProperty({
    description: 'Workspace member user id to add into the group DM.',
    format: 'uuid',
    example: '4356b7ac-679b-4021-9ed8-a912624a3d8f',
  })
  @IsUUID()
  userId!: string;
}
