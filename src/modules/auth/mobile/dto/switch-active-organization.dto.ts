import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class SwitchActiveOrganizationDto {
  @ApiProperty({
    required: false,
    nullable: true,
    description:
      'Organization id to activate in token context. Send null/omit to clear active organization.',
    example: '7c025579-8f27-4d40-bb22-e3fbf027f440',
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;
}
