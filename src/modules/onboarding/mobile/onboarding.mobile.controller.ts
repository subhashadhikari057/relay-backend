import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AccessTokenGuard } from 'src/modules/auth/shared/guards/access-token.guard';
import type { AuthJwtPayload } from 'src/modules/auth/shared/interfaces/auth-jwt-payload.interface';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { CompleteOnboardingResponseDto } from './dto/complete-onboarding-response.dto';
import { OnboardingMobileService } from './onboarding.mobile.service';

@Controller('api/mobile/onboarding')
@ApiTags('Mobile Onboarding')
@UseGuards(AccessTokenGuard)
@ApiBearerAuth('bearer')
export class OnboardingMobileController {
  constructor(
    private readonly onboardingMobileService: OnboardingMobileService,
  ) {}

  @Post('complete')
  @ApiOperation({
    operationId: 'mobileOnboardingComplete',
    summary: 'Complete Onboarding',
    description:
      'Create first workspace, first channel, optional invites, profile avatar settings, and activate the workspace in one backend workflow.',
  })
  @ApiBody({
    type: CompleteOnboardingDto,
    description:
      'Onboarding payload. Upload avatar images through /api/mobile/upload/single first, then pass returned URLs here.',
  })
  @ApiOkResponse({
    type: CompleteOnboardingResponseDto,
    description: 'Onboarding completed successfully.',
  })
  complete(
    @CurrentUser() currentUser: AuthJwtPayload,
    @Body() dto: CompleteOnboardingDto,
  ) {
    return this.onboardingMobileService.completeOnboarding(currentUser, dto);
  }
}
