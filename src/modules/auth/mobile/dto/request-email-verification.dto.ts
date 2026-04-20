import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RequestEmailVerificationDto {
  @ApiPropertyOptional({
    description: 'Optional client hint for diagnostics/logging.',
    example: 'mobile-app',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  clientHint?: string;
}
