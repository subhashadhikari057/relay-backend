export const ALLOWED_MESSAGE_REACTIONS = [
  '👍',
  '❤️',
  '😂',
  '🎉',
  '🔥',
] as const;

export type AllowedMessageReactionEmoji =
  (typeof ALLOWED_MESSAGE_REACTIONS)[number];
