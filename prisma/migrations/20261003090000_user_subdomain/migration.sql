-- AlterTable
ALTER TABLE "users" ADD COLUMN "subdomain" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_subdomain_key" ON "users"("subdomain");
