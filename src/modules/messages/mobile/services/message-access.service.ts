import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { WorkspacePolicyService } from 'src/modules/workspaces/shared/services/workspace-policy.service';
import { ChannelAccess } from '../messages.types';

@Injectable()
export class MessageAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly workspacePolicyService: WorkspacePolicyService,
  ) {}

  async resolveChannelAccess(
    userId: string,
    workspaceId: string,
    channelId: string,
    options?: { forRead?: boolean },
  ): Promise<ChannelAccess> {
    await this.workspacePolicyService.resolveMembershipOrThrow(
      userId,
      workspaceId,
    );

    const channel = await this.prisma.channel.findFirst({
      where: {
        id: channelId,
        workspaceId,
      },
      select: {
        id: true,
        workspaceId: true,
        type: true,
        isArchived: true,
        members: {
          where: { userId },
          select: { userId: true },
          take: 1,
        },
      },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    const isMember = channel.members.length > 0;
    if (channel.type === 'private' && !isMember) {
      throw new ForbiddenException(
        'You are not a member of this private channel',
      );
    }

    if (options?.forRead !== true && !isMember) {
      throw new ForbiddenException('Join channel before posting messages');
    }

    return {
      id: channel.id,
      workspaceId: channel.workspaceId,
      type: channel.type,
      isArchived: channel.isArchived,
      isMember,
    };
  }

  assertCanWriteToChannel(channel: ChannelAccess) {
    if (channel.isArchived) {
      throw new BadRequestException('Archived channels are read-only');
    }

    if (!channel.isMember) {
      throw new ForbiddenException('Join channel before posting messages');
    }
  }

  assertCanMutateMessage(
    userId: string,
    senderUserId: string,
    createdAt: Date,
  ) {
    if (userId !== senderUserId) {
      throw new ForbiddenException('You can only modify your own messages');
    }

    const editWindowMinutes = this.configService.get<number>(
      'messages.editWindowMinutes',
      30,
    );
    const windowMs = Math.max(editWindowMinutes, 1) * 60 * 1000;

    if (Date.now() - createdAt.getTime() > windowMs) {
      throw new ForbiddenException('Message edit/delete window has expired');
    }
  }
}
