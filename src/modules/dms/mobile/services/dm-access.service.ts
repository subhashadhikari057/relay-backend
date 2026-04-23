import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DirectConversationType } from '@prisma/client';
import { WorkspacePolicyService } from 'src/modules/workspaces/shared/services/workspace-policy.service';
import { PrismaService } from 'src/prisma/prisma.service';

export type DirectConversationAccess = {
  id: string;
  workspaceId: string;
  type: DirectConversationType;
  title: string | null;
  createdById: string;
};

@Injectable()
export class DmAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly workspacePolicyService: WorkspacePolicyService,
  ) {}

  async resolveConversationAccess(
    userId: string,
    workspaceId: string,
    directConversationId: string,
  ): Promise<DirectConversationAccess> {
    await this.workspacePolicyService.resolveMembershipOrThrow(
      userId,
      workspaceId,
    );

    const conversation = await this.prisma.directConversation.findFirst({
      where: {
        id: directConversationId,
        workspaceId,
        members: {
          some: {
            userId,
            leftAt: null,
          },
        },
      },
      select: {
        id: true,
        workspaceId: true,
        type: true,
        title: true,
        createdById: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Direct conversation not found');
    }

    return conversation;
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

  assertGroupConversation(conversation: DirectConversationAccess) {
    if (conversation.type !== DirectConversationType.group) {
      throw new BadRequestException(
        'This operation is only allowed for group DMs',
      );
    }
  }
}
