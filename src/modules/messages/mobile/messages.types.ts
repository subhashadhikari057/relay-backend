import { ChannelType } from '@prisma/client';

export type MessageCursor = {
  createdAt: string;
  id: string;
};

export type ChannelAccess = {
  id: string;
  workspaceId: string;
  type: ChannelType;
  isArchived: boolean;
  isMember: boolean;
};
