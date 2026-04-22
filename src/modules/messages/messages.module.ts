import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { MessagesMobileController } from './mobile/messages.mobile.controller';
import { MessagesMobileService } from './mobile/messages.mobile.service';

@Module({
  imports: [AuthModule, WorkspacesModule],
  controllers: [MessagesMobileController],
  providers: [MessagesMobileService],
})
export class MessagesModule {}
