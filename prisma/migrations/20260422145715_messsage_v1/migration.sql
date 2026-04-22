-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('text', 'file', 'system');

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "channel_id" UUID NOT NULL,
    "sender_user_id" UUID NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'text',
    "content" TEXT,
    "metadata" JSONB,
    "parent_message_id" UUID,
    "edited_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_attachments" (
    "id" UUID NOT NULL,
    "message_id" UUID NOT NULL,
    "path" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER,
    "height" INTEGER,
    "duration_ms" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "messages_channel_id_created_at_id_idx" ON "messages"("channel_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "messages_parent_message_id_created_at_id_idx" ON "messages"("parent_message_id", "created_at", "id");

-- CreateIndex
CREATE INDEX "messages_sender_user_id_created_at_idx" ON "messages"("sender_user_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_workspace_id_channel_id_deleted_at_idx" ON "messages"("workspace_id", "channel_id", "deleted_at");

-- CreateIndex
CREATE INDEX "message_attachments_message_id_sort_order_idx" ON "message_attachments"("message_id", "sort_order");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_parent_message_id_fkey" FOREIGN KEY ("parent_message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
