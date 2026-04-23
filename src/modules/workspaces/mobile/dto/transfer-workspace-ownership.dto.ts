import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class TransferWorkspaceOwnershipDto {
  @ApiProperty({
    description: 'Target user id that will become workspace owner.',
    example: '01968c8f-7777-7f21-bf00-9fa93cf2f111',
  })
  @IsUUID()
  newOwnerUserId!: string;
}
