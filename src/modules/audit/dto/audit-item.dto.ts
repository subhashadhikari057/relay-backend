import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuditAction, AuditEntityType } from '../shared/audit.constants';

export class AuditItemDto {
  @ApiProperty({
    description: 'Audit event id.',
    example: '0196af6e-13a7-7f36-abec-42c8a530e934',
  })
  id!: string;

  @ApiPropertyOptional({
    description: 'Workspace id when event is workspace-scoped.',
    example: '01968c8b-a4fc-7a08-b3d2-4e69ec7fcbf3',
  })
  workspaceId!: string | null;

  @ApiPropertyOptional({
    description: 'Actor user id when available.',
    example: '01968c8f-1234-7cd1-abcd-cc79f9d1d4d6',
  })
  actorUserId!: string | null;

  @ApiProperty({
    description: 'Canonical audit action key.',
    enum: AuditAction,
    example: AuditAction.WORKSPACE_INVITE_CREATED,
  })
  action!: AuditAction;

  @ApiProperty({
    description: 'Entity type associated with action.',
    enum: AuditEntityType,
    example: AuditEntityType.WORKSPACE_INVITE,
  })
  entityType!: AuditEntityType;

  @ApiProperty({
    description: 'Entity id associated with action.',
    example: '01968c93-2ee0-7fef-a798-afbaf289ad26',
  })
  entityId!: string;

  @ApiPropertyOptional({
    description: 'Additional event metadata.',
    example: { email: 'invitee@relay.com', role: 'member' },
  })
  metadata!: Record<string, unknown> | null;

  @ApiProperty({
    description: 'Audit event creation timestamp.',
    example: '2026-04-22T13:20:00.000Z',
  })
  createdAt!: Date;
}
