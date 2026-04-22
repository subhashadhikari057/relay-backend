import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class TransferOrganizationOwnershipDto {
  @ApiProperty({
    description: 'Target user id that will become organization owner.',
    example: '01968c8f-7777-7f21-bf00-9fa93cf2f111',
  })
  @IsUUID()
  newOwnerUserId!: string;
}
