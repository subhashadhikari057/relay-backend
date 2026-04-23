import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MessagesModule } from '../messages/messages.module';
import { SystemMessagesModule } from '../system-messages/system-messages.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { DmMessagePinsMobileController } from './mobile/dm-message-pins.mobile.controller';
import { DmMessageReactionsMobileController } from './mobile/dm-message-reactions.mobile.controller';
import { DmMessagesMobileController } from './mobile/dm-messages.mobile.controller';
import { DmsMobileController } from './mobile/dms.mobile.controller';
import { DmAccessService } from './mobile/services/dm-access.service';
import { DmConversationService } from './mobile/services/dm-conversation.service';
import { DmMessagesService } from './mobile/services/dm-messages.service';
import { DmPinService } from './mobile/services/dm-pin.service';
import { DmReadStateService } from './mobile/services/dm-read-state.service';
import { DmReactionService } from './mobile/services/dm-reaction.service';
import { DmSearchService } from './mobile/services/dm-search.service';

@Module({
  imports: [AuthModule, WorkspacesModule, MessagesModule, SystemMessagesModule],
  controllers: [
    DmsMobileController,
    DmMessagesMobileController,
    DmMessageReactionsMobileController,
    DmMessagePinsMobileController,
  ],
  providers: [
    DmAccessService,
    DmConversationService,
    DmMessagesService,
    DmReadStateService,
    DmSearchService,
    DmReactionService,
    DmPinService,
  ],
})
export class DmsModule {}
