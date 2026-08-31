/*
  Warnings:

  - You are about to drop the `project_members` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `project_members` DROP FOREIGN KEY `project_members_project_id_fkey`;

-- DropForeignKey
ALTER TABLE `project_members` DROP FOREIGN KEY `project_members_user_id_fkey`;

-- DropTable
DROP TABLE `project_members`;
