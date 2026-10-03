-- AlterTable
ALTER TABLE "users" ADD COLUMN     "reminder_emails" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "timezone" TEXT;

-- AlterTable
ALTER TABLE "workspace_settings" ADD COLUMN     "email_reminders" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "reminder_digests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "for_date" TEXT NOT NULL,
    "item_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'sending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reminder_digests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reminder_digests_user_id_for_date_key" ON "reminder_digests"("user_id", "for_date");

-- AddForeignKey
ALTER TABLE "reminder_digests" ADD CONSTRAINT "reminder_digests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Written only by the reminder cron (system connection); tenants never read it.
REVOKE ALL ON "reminder_digests" FROM app_tenant;
ALTER TABLE "reminder_digests" ENABLE ROW LEVEL SECURITY;
