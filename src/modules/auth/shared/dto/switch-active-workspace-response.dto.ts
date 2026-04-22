import { ApiProperty } from '@nestjs/swagger';
import { AuthTokenResponseDto } from './auth-token-response.dto';

export class SwitchActiveWorkspaceResponseDto extends AuthTokenResponseDto {
  @ApiProperty({
    nullable: true,
    description: 'Currently active workspace id carried in access token.',
    example: '7c025579-8f27-4d40-bb22-e3fbf027f440',
  })
  activeWorkspaceId!: string | null;
}
