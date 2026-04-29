import { ApiProperty } from '@nestjs/swagger';

export class MessageAuthorDto {
  @ApiProperty({
    description: 'Author user id.',
    format: 'uuid',
    example: '4356b7ac-679b-4021-9ed8-a912624a3d8f',
  })
  id!: string;

  @ApiProperty({
    description: 'Author full name.',
    example: 'Relay User',
  })
  fullName!: string;

  @ApiProperty({
    description: 'Author display name.',
    nullable: true,
    example: 'User',
  })
  displayName!: string | null;

  @ApiProperty({
    description: 'Author avatar URL.',
    nullable: true,
    example: 'https://cdn.relay.com/avatar/u1.png',
  })
  avatarUrl!: string | null;

  @ApiProperty({
    description: 'Author avatar color.',
    nullable: true,
    example: '#5B5BD6',
  })
  avatarColor!: string | null;
}
