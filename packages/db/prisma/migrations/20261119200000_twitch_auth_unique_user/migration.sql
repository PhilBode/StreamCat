-- One Twitch account may belong to exactly one guild.
-- Existing duplicates keep the oldest link; duplicate guilds lose their Twitch connection data.
CREATE TEMP TABLE duplicate_twitch_guilds AS
SELECT "guildId"
FROM (
    SELECT "guildId", row_number() OVER (PARTITION BY "userId" ORDER BY "createdAt" ASC, "guildId" ASC) AS rn
    FROM "TwitchAuth"
) ranked
WHERE rn > 1;

DELETE FROM "TwitchReward" WHERE "guildId" IN (SELECT "guildId" FROM duplicate_twitch_guilds);
DELETE FROM "SongRequestConfig" WHERE "guildId" IN (SELECT "guildId" FROM duplicate_twitch_guilds);
DELETE FROM "TwitchConfig" WHERE "guildId" IN (SELECT "guildId" FROM duplicate_twitch_guilds) AND "mainStream" = true;
DELETE FROM "TwitchAuth" WHERE "guildId" IN (SELECT "guildId" FROM duplicate_twitch_guilds);

DROP TABLE duplicate_twitch_guilds;

CREATE UNIQUE INDEX "TwitchAuth_userId_key" ON "TwitchAuth"("userId");
