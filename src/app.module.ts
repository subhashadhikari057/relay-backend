import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { MembersModule } from './modules/members/members.module';
import { ChannelsModule } from './modules/channels/channels.module';
import { DmsModule } from './modules/dms/dms.module';
import { MessagesModule } from './modules/messages/messages.module';
import { ReactionsModule } from './modules/reactions/reactions.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { HealthModule } from './modules/health/health.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { UploadModule } from './modules/upload/upload.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    WorkspacesModule,
    MembersModule,
    ChannelsModule,
    DmsModule,
    MessagesModule,
    ReactionsModule,
    NotificationsModule,
    HealthModule,
    OrganizationsModule,
    UploadModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
