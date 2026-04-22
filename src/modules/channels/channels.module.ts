import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { ChannelsMobileController } from './mobile/channels.mobile.controller';
import { ChannelsMobileService } from './mobile/channels.mobile.service';

@Module({
  imports: [AuthModule, WorkspacesModule],
  controllers: [ChannelsMobileController],
  providers: [ChannelsMobileService],
})
export class ChannelsModule {}
