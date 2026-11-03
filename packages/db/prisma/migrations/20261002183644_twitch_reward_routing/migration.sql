-- Dedicated reward-mapping table for Twitch channel-point redemptions.
-- Replaces the single-purpose TwitchConfig.spotifySr column so N reward kinds
-- can be mapped per guild without further schema changes. TwitchReward is a
-- pure mapping: titles are always resolved live (redemption event / Twitch API)
-- and never stored.
-- NOTE: applied manually in the original environment (see below) because that
-- database had drifted ahead of the migration history and `migrate dev`
-- demands a reset. This squashed file is the single migration to deploy
-- elsewhere (`migrate deploy`).

-- CreateEnum
CREATE TYPE "TwitchRewardKind" AS ENUM ('SPOTIFY_SR');

-- CreateTable
CREATE TABLE "TwitchReward" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "kind" "TwitchRewardKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TwitchReward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TwitchReward_guildId_rewardId_key" ON "TwitchReward"("guildId", "rewardId");

-- CreateIndex
CREATE INDEX "TwitchReward_guildId_idx" ON "TwitchReward"("guildId");

-- AddForeignKey
ALTER TABLE "TwitchReward" ADD CONSTRAINT "TwitchReward_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "GuildConfig"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: carry any existing song-request mappings into the new table
-- before the old column goes away. No-op when there are none.
INSERT INTO "TwitchReward" ("guildId", "rewardId", "kind", "createdAt", "updatedAt")
SELECT "guildId", "spotifySr", 'SPOTIFY_SR', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "TwitchConfig"
WHERE "spotifySr" IS NOT NULL
ON CONFLICT ("guildId", "rewardId") DO NOTHING;

-- AlterTable
ALTER TABLE "TwitchConfig" DROP COLUMN "spotifySr";
