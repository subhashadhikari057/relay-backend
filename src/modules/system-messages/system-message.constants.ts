export enum SystemMessageEvent {
  WORKSPACE_CREATED = 'workspace.created',
  WORKSPACE_MEMBER_JOINED = 'workspace.member.joined',
  WORKSPACE_MEMBER_LEFT = 'workspace.member.left',
  WORKSPACE_MEMBER_REMOVED = 'workspace.member.removed',
  WORKSPACE_OWNERSHIP_TRANSFERRED = 'workspace.ownership.transferred',
  CHANNEL_CREATED = 'channel.created',
  CHANNEL_ARCHIVED = 'channel.archived',
  CHANNEL_JOINED = 'channel.joined',
  CHANNEL_LEFT = 'channel.left',
  CHANNEL_MEMBER_ADDED = 'channel.member.added',
  CHANNEL_MEMBER_REMOVED = 'channel.member.removed',
}
