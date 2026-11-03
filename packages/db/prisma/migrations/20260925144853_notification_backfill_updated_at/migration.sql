-- Run before the existing channel migration; keep applied migration checksums unchanged.
INSERT INTO "NotificationConfig" ("guildId", "liveChannel", "partnerChannel", "updatedAt")
SELECT gc."guildId", gc."logChannel", gc."logChannel", CURRENT_TIMESTAMP
FROM "GuildConfig" gc
ON CONFLICT ("guildId") DO NOTHING;
