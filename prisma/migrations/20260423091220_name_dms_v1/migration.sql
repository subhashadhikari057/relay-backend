-- CreateEnum
CREATE TYPE "DirectConversationType" AS ENUM ('one_to_one', 'group');

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "direct_conversation_id" UUID,
ALTER COLUMN "channel_id" DROP NOT NULL;

-- AddCheckConstraint
ALTER TABLE "messages"
ADD CONSTRAINT "messages_exactly_one_container_chk"
CHECK (
  ("channel_id" IS NOT NULL AND "direct_conversation_id" IS NULL)
  OR
  ("channel_id" IS NULL AND "direct_conversation_id" IS NOT NULL)
);

-- CreateTable
CREATE TABLE "direct_conversations" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "type" "DirectConversationType" NOT NULL DEFAULT 'one_to_one',
    "one_to_one_key" VARCHAR(160),
    "title" VARCHAR(160),
    "last_message_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "direct_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direct_conversation_members" (
    "direct_conversation_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMPTZ(6),

    CONSTRAINT "direct_conversation_members_pkey" PRIMARY KEY ("direct_conversation_id","user_id")
);

-- CreateTable
CREATE TABLE "user_dm_reads" (
    "user_id" UUID NOT NULL,
    "direct_conversation_id" UUID NOT NULL,
    "last_read_message_id" UUID,
    "last_read_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_dm_reads_pkey" PRIMARY KEY ("user_id","direct_conversation_id")
);

-- CreateIndex
CREATE INDEX "direct_conversations_workspace_id_updated_at_idx" ON "direct_conversations"("workspace_id", "updated_at");

-- CreateIndex
CREATE INDEX "direct_conversations_workspace_id_last_message_at_idx" ON "direct_conversations"("workspace_id", "last_message_at");

-- CreateIndex
CREATE INDEX "direct_conversations_created_by_id_idx" ON "direct_conversations"("created_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "direct_conversations_workspace_id_one_to_one_key_key" ON "direct_conversations"("workspace_id", "one_to_one_key");

-- CreateIndex
CREATE INDEX "direct_conversation_members_user_id_joined_at_idx" ON "direct_conversation_members"("user_id", "joined_at");

-- CreateIndex
CREATE INDEX "direct_conversation_members_direct_conversation_id_joined_a_idx" ON "direct_conversation_members"("direct_conversation_id", "joined_at");

-- CreateIndex
CREATE INDEX "direct_conversation_members_left_at_idx" ON "direct_conversation_members"("left_at");

-- CreateIndex
CREATE INDEX "user_dm_reads_direct_conversation_id_idx" ON "user_dm_reads"("direct_conversation_id");

-- CreateIndex
CREATE INDEX "messages_direct_conversation_id_created_at_id_idx" ON "messages"("direct_conversation_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "messages_workspace_id_direct_conversation_id_deleted_at_idx" ON "messages"("workspace_id", "direct_conversation_id", "deleted_at");

-- CreateIndex
CREATE INDEX "messages_direct_conversation_id_deleted_at_created_at_id_idx" ON "messages"("direct_conversation_id", "deleted_at", "created_at", "id");

-- AddForeignKey
ALTER TABLE "direct_conversations" ADD CONSTRAINT "direct_conversations_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_conversations" ADD CONSTRAINT "direct_conversations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_conversation_members" ADD CONSTRAINT "direct_conversation_members_direct_conversation_id_fkey" FOREIGN KEY ("direct_conversation_id") REFERENCES "direct_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_conversation_members" ADD CONSTRAINT "direct_conversation_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_dm_reads" ADD CONSTRAINT "user_dm_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_dm_reads" ADD CONSTRAINT "user_dm_reads_direct_conversation_id_fkey" FOREIGN KEY ("direct_conversation_id") REFERENCES "direct_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_direct_conversation_id_fkey" FOREIGN KEY ("direct_conversation_id") REFERENCES "direct_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
