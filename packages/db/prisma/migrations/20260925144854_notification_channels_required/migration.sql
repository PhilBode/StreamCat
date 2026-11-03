-- Backfill: create NotificationConfig for guilds that have none (channels default to the guild's log channel)
INSERT INTO "NotificationConfig" ("guildId", "liveChannel", "partnerChannel")
SELECT gc."guildId", gc."logChannel", gc."logChannel"
FROM "GuildConfig" gc
WHERE NOT EXISTS (SELECT 1 FROM "NotificationConfig" nc WHERE nc."guildId" = gc."guildId");

-- Backfill: fill NULL channels (live falls back to log channel, partner falls back to resolved live channel)
UPDATE "NotificationConfig" nc
SET "liveChannel" = COALESCE(nc."liveChannel", gc."logChannel")
FROM "GuildConfig" gc
WHERE gc."guildId" = nc."guildId" AND nc."liveChannel" IS NULL;

UPDATE "NotificationConfig" nc
SET "partnerChannel" = COALESCE(nc."partnerChannel", nc."liveChannel")
WHERE nc."partnerChannel" IS NULL;

-- AlterTable
ALTER TABLE "NotificationConfig" ALTER COLUMN "liveChannel" SET NOT NULL,
ALTER COLUMN "partnerChannel" SET NOT NULL;
