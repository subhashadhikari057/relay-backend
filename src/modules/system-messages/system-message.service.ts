import { Injectable, Logger } from '@nestjs/common';
import { MessageType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { SystemMessageEvent } from './system-message.constants';

type PublishInput = {
  workspaceId: string;
  channelId: string;
  event: SystemMessageEvent;
  actorUserId?: string;
  targetUserId?: string;
  metadata?: Record<string, unknown>;
};

type PublishToGeneralInput = Omit<PublishInput, 'channelId'>;

type PublishToDirectConversationInput = {
  workspaceId: string;
  directConversationId: string;
  event: SystemMessageEvent;
  actorUserId?: string;
  targetUserId?: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class SystemMessageService {
  private readonly logger = new Logger(SystemMessageService.name);

  constructor(private readonly prisma: PrismaService) {}

  async publishToWorkspaceGeneralSafe(input: PublishToGeneralInput) {
    try {
      const generalChannel = await this.prisma.channel.findFirst({
        where: {
          workspaceId: input.workspaceId,
          name: 'general',
        },
        select: {
          id: true,
        },
      });

      if (!generalChannel) {
        this.logger.warn(
          `Skipped system message because general channel was not found for workspace=${input.workspaceId}`,
        );
        return;
      }

      await this.publishToChannelSafe({
        ...input,
        channelId: generalChannel.id,
      });
    } catch (error) {
      this.logger.warn(
        `Failed to publish system message to workspace general workspaceId=${input.workspaceId} event=${input.event}`,
      );
      this.logger.debug(error);
    }
  }

  async publishToChannelSafe(input: PublishInput) {
    try {
      const senderUserId = input.actorUserId ?? input.targetUserId;
      if (!senderUserId) {
        this.logger.warn(
          `Skipped system message because no sender could be derived for workspace=${input.workspaceId} channel=${input.channelId} event=${input.event}`,
        );
        return;
      }

      const [actor, target, channel] = await Promise.all([
        input.actorUserId
          ? this.prisma.user.findUnique({
              where: { id: input.actorUserId },
              select: {
                id: true,
                fullName: true,
                displayName: true,
                email: true,
              },
            })
          : Promise.resolve(null),
        input.targetUserId
          ? this.prisma.user.findUnique({
              where: { id: input.targetUserId },
              select: {
                id: true,
                fullName: true,
                displayName: true,
                email: true,
              },
            })
          : Promise.resolve(null),
        this.prisma.channel.findFirst({
          where: {
            id: input.channelId,
            workspaceId: input.workspaceId,
          },
          select: {
            id: true,
            name: true,
          },
        }),
      ]);

      if (!channel) {
        this.logger.warn(
          `Skipped system message because channel was not found workspace=${input.workspaceId} channel=${input.channelId} event=${input.event}`,
        );
        return;
      }

      const content = this.buildContent({
        event: input.event,
        actorName: this.getDisplayName(actor),
        targetName: this.getDisplayName(target),
        channelName: channel.name,
      });

      await this.prisma.message.create({
        data: {
          workspaceId: input.workspaceId,
          channelId: input.channelId,
          senderUserId,
          type: MessageType.system,
          content,
          metadata: {
            event: input.event,
            actorUserId: input.actorUserId ?? null,
            targetUserId: input.targetUserId ?? null,
            ...input.metadata,
          },
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to publish system message workspace=${input.workspaceId} channel=${input.channelId} event=${input.event}`,
      );
      this.logger.debug(error);
    }
  }

  async publishToDirectConversationSafe(
    input: PublishToDirectConversationInput,
  ) {
    try {
      const senderUserId = input.actorUserId ?? input.targetUserId;
      if (!senderUserId) {
        this.logger.warn(
          `Skipped DM system message because no sender could be derived for workspace=${input.workspaceId} dm=${input.directConversationId} event=${input.event}`,
        );
        return;
      }

      const [actor, target, directConversation] = await Promise.all([
        input.actorUserId
          ? this.prisma.user.findUnique({
              where: { id: input.actorUserId },
              select: {
                id: true,
                fullName: true,
                displayName: true,
                email: true,
              },
            })
          : Promise.resolve(null),
        input.targetUserId
          ? this.prisma.user.findUnique({
              where: { id: input.targetUserId },
              select: {
                id: true,
                fullName: true,
                displayName: true,
                email: true,
              },
            })
          : Promise.resolve(null),
        this.prisma.directConversation.findFirst({
          where: {
            id: input.directConversationId,
            workspaceId: input.workspaceId,
          },
          select: {
            id: true,
            title: true,
            type: true,
          },
        }),
      ]);

      if (!directConversation) {
        this.logger.warn(
          `Skipped DM system message because conversation was not found workspace=${input.workspaceId} dm=${input.directConversationId} event=${input.event}`,
        );
        return;
      }

      const content = this.buildContent({
        event: input.event,
        actorName: this.getDisplayName(actor),
        targetName: this.getDisplayName(target),
        channelName: directConversation.title ?? 'this conversation',
      });

      const now = new Date();
      await this.prisma.$transaction(async (tx) => {
        await tx.message.create({
          data: {
            workspaceId: input.workspaceId,
            directConversationId: input.directConversationId,
            senderUserId,
            type: MessageType.system,
            content,
            metadata: {
              event: input.event,
              actorUserId: input.actorUserId ?? null,
              targetUserId: input.targetUserId ?? null,
              ...input.metadata,
            },
          },
        });

        await tx.directConversation.update({
          where: {
            id: input.directConversationId,
          },
          data: {
            lastMessageAt: now,
          },
        });
      });
    } catch (error) {
      this.logger.warn(
        `Failed to publish DM system message workspace=${input.workspaceId} dm=${input.directConversationId} event=${input.event}`,
      );
      this.logger.debug(error);
    }
  }

  private getDisplayName(
    user: {
      id: string;
      fullName: string;
      displayName: string | null;
      email: string;
    } | null,
  ) {
    if (!user) {
      return 'Someone';
    }

    return user.displayName?.trim() || user.fullName?.trim() || user.email;
  }

  private buildContent(input: {
    event: SystemMessageEvent;
    actorName: string;
    targetName: string;
    channelName: string;
  }) {
    switch (input.event) {
      case SystemMessageEvent.WORKSPACE_CREATED:
        return `${input.actorName} created this workspace.`;
      case SystemMessageEvent.WORKSPACE_MEMBER_JOINED:
        return `${input.targetName} joined the workspace.`;
      case SystemMessageEvent.WORKSPACE_MEMBER_LEFT:
        return `${input.actorName} left the workspace.`;
      case SystemMessageEvent.WORKSPACE_MEMBER_REMOVED:
        return `${input.actorName} removed ${input.targetName} from the workspace.`;
      case SystemMessageEvent.WORKSPACE_OWNERSHIP_TRANSFERRED:
        return `${input.actorName} transferred workspace ownership to ${input.targetName}.`;
      case SystemMessageEvent.CHANNEL_CREATED:
        return `${input.actorName} created #${input.channelName}.`;
      case SystemMessageEvent.CHANNEL_ARCHIVED:
        return `${input.actorName} archived #${input.channelName}.`;
      case SystemMessageEvent.CHANNEL_JOINED:
        return `${input.actorName} joined #${input.channelName}.`;
      case SystemMessageEvent.CHANNEL_LEFT:
        return `${input.actorName} left #${input.channelName}.`;
      case SystemMessageEvent.CHANNEL_MEMBER_ADDED:
        return `${input.actorName} added ${input.targetName} to #${input.channelName}.`;
      case SystemMessageEvent.CHANNEL_MEMBER_REMOVED:
        return `${input.actorName} removed ${input.targetName} from #${input.channelName}.`;
      case SystemMessageEvent.DM_CREATED:
        return `${input.actorName} created this conversation.`;
      case SystemMessageEvent.DM_MEMBER_ADDED:
        return `${input.actorName} added ${input.targetName} to this conversation.`;
      case SystemMessageEvent.DM_MEMBER_REMOVED:
        return `${input.actorName} removed ${input.targetName} from this conversation.`;
      case SystemMessageEvent.DM_MEMBER_LEFT:
        return `${input.actorName} left this conversation.`;
      default:
        return 'A system event occurred.';
    }
  }
}
