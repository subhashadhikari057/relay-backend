import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { MessagePinsMobileController } from './mobile/message-pins.mobile.controller';
import { MessageReactionsMobileController } from './mobile/message-reactions.mobile.controller';
import { MessagesMobileController } from './mobile/messages.mobile.controller';
import { MessagesMobileService } from './mobile/messages.mobile.service';
import { MessageAccessService } from './mobile/services/message-access.service';
import { MessageEngagementService } from './mobile/services/message-engagement.service';
import { MessagePinService } from './mobile/services/message-pin.service';
import { MessagePresenterService } from './mobile/services/message-presenter.service';
import { MessageQueryService } from './mobile/services/message-query.service';
import { MessageReactionService } from './mobile/services/message-reaction.service';
import { MessageValidationService } from './mobile/services/message-validation.service';

@Module({
  imports: [AuthModule, WorkspacesModule],
  controllers: [
    MessagesMobileController,
    MessageReactionsMobileController,
    MessagePinsMobileController,
  ],
  providers: [
    MessagesMobileService,
    MessageAccessService,
    MessageValidationService,
    MessagePresenterService,
    MessageQueryService,
    MessageEngagementService,
    MessageReactionService,
    MessagePinService,
  ],
})
export class MessagesModule {}
