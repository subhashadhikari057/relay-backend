import { ApiProperty } from '@nestjs/swagger';
import { AuditItemDto } from './audit-item.dto';

export class MobileMyAuditResponseDto {
  @ApiProperty({
    description: 'Number of audit records in this response page.',
    example: 20,
  })
  count!: number;

  @ApiProperty({
    description: 'Current page number (1-based).',
    example: 1,
  })
  page!: number;

  @ApiProperty({
    description: 'Page size used for this response.',
    example: 20,
  })
  limit!: number;

  @ApiProperty({
    description: 'Audit records for the authenticated user.',
    type: AuditItemDto,
    isArray: true,
  })
  items!: AuditItemDto[];
}
