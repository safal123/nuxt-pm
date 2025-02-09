/*
  Warnings:

  - Added the required column `created_by` to the `projects` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_by` to the `workspaces` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `workspaces` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `projects` ADD COLUMN `created_by` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `active_project_id` VARCHAR(191) NULL,
    ADD COLUMN `active_workspace_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `workspaces` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `created_by` VARCHAR(191) NOT NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- AddForeignKey
ALTER TABLE `workspaces` ADD CONSTRAINT `workspaces_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
