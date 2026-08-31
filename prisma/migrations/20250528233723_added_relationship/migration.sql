-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_active_workspace_id_fkey` FOREIGN KEY (`active_workspace_id`) REFERENCES `workspaces`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_active_project_id_fkey` FOREIGN KEY (`active_project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
