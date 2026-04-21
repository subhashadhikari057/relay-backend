import { ApiProperty } from '@nestjs/swagger';
import { AuditItemDto } from './audit-item.dto';

export class MobileOrganizationActivityResponseDto {
  @ApiProperty({
    description: 'Number of audit activity records returned.',
    example: 20,
  })
  count!: number;

  @ApiProperty({
    description: 'Organization activity events from audit log.',
    type: AuditItemDto,
    isArray: true,
  })
  activities!: AuditItemDto[];
}
