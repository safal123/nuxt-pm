-- Keep every generate as its own row so briefings can be tracked over time.

DROP INDEX IF EXISTS "ai_summaries_attachable_type_attachable_id_key";

CREATE INDEX "ai_summaries_attachable_type_attachable_id_generated_at_idx"
  ON "ai_summaries"("attachable_type", "attachable_id", "generated_at");
