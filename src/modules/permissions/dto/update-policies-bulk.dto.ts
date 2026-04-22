import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { UpdatePolicyDto } from './update-policy.dto';

export class UpdatePoliciesBulkDto {
  @ApiProperty({
    type: [UpdatePolicyDto],
    description: 'List of policy updates to apply in one request.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdatePolicyDto)
  updates!: UpdatePolicyDto[];
}
