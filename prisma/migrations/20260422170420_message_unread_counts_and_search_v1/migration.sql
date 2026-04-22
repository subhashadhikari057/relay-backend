-- CreateIndex
CREATE INDEX "messages_workspace_id_deleted_at_created_at_id_idx" ON "messages"("workspace_id", "deleted_at", "created_at", "id");

-- CreateIndex
CREATE INDEX "messages_channel_id_deleted_at_created_at_id_idx" ON "messages"("channel_id", "deleted_at", "created_at", "id");
