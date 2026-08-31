-- DropForeignKey
ALTER TABLE `projects` DROP FOREIGN KEY `projects_created_by_fkey`;

-- DropForeignKey
ALTER TABLE `projects` DROP FOREIGN KEY `projects_workspace_id_fkey`;

-- DropForeignKey
ALTER TABLE `workspace_members` DROP FOREIGN KEY `workspace_members_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `workspace_members` DROP FOREIGN KEY `workspace_members_workspace_id_fkey`;

-- DropForeignKey
ALTER TABLE `workspaces` DROP FOREIGN KEY `workspaces_created_by_fkey`;

-- DropIndex
DROP INDEX `projects_created_by_fkey` ON `projects`;

-- DropIndex
DROP INDEX `projects_workspace_id_fkey` ON `projects`;

-- DropIndex
DROP INDEX `clerkId` ON `users`;

-- DropIndex
DROP INDEX `email` ON `users`;

-- DropIndex
DROP INDEX `workspace_members_workspace_id_fkey` ON `workspace_members`;

-- DropIndex
DROP INDEX `workspaces_created_by_fkey` ON `workspaces`;

-- AddForeignKey
ALTER TABLE `workspaces` ADD CONSTRAINT `workspaces_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workspace_members` ADD CONSTRAINT `workspace_members_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workspace_members` ADD CONSTRAINT `workspace_members_workspace_id_fkey` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `projects` ADD CONSTRAINT `projects_workspace_id_fkey` FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
