/*
  Warnings:

  - Made the column `logChannel` on table `GuildConfig` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "GuildConfig" ALTER COLUMN "logChannel" SET NOT NULL;
