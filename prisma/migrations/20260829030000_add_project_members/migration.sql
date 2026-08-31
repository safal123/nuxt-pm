-- CreateTable
CREATE TABLE `project_members` (
    `user_id` VARCHAR(191) NOT NULL,
    `project_id` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'MEMBER',
    `addedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`user_id`, `project_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `project_members` ADD CONSTRAINT `project_members_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_members` ADD CONSTRAINT `project_members_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: every workspace member becomes a member of that workspace's projects
INSERT INTO `project_members` (`user_id`, `project_id`, `role`, `addedAt`)
SELECT `wm`.`user_id`, `p`.`id`,
    CASE WHEN `p`.`created_by` = `wm`.`user_id` THEN 'OWNER' ELSE 'MEMBER' END,
    CURRENT_TIMESTAMP(3)
FROM `projects` `p`
INNER JOIN `workspace_members` `wm` ON `wm`.`workspace_id` = `p`.`workspace_id`;

-- Backfill project creators who are not already workspace members
INSERT IGNORE INTO `project_members` (`user_id`, `project_id`, `role`, `addedAt`)
SELECT `p`.`created_by`, `p`.`id`, 'OWNER', CURRENT_TIMESTAMP(3)
FROM `projects` `p`;
