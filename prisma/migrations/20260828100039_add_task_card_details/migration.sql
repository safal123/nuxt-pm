-- AlterTable
ALTER TABLE `tasks` ADD COLUMN `cover_color` VARCHAR(191) NULL,
    ADD COLUMN `labels` JSON NULL,
    ADD COLUMN `start_date` DATETIME(3) NULL,
    MODIFY `description` TEXT NULL;

-- CreateTable
CREATE TABLE `task_members` (
    `task_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `addedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`task_id`, `user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `task_members` ADD CONSTRAINT `task_members_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_members` ADD CONSTRAINT `task_members_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
