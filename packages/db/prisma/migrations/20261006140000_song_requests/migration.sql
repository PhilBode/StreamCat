-- Add independent request routing; keep existing auths and notification follows.
CREATE TABLE "SongRequestConfig" (
    "channelId" TEXT,
    "guildId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "SongRequestConfig_pkey" PRIMARY KEY ("guildId"),
    CONSTRAINT "SongRequestConfig_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "GuildConfig"("guildId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SongRequestConfig_channelId_key" ON "SongRequestConfig"("channelId");

-- Older installations may link the same Twitch account in several guilds.
-- Assign the oldest link, with guild ID as a stable tie-breaker; retain all links.
INSERT INTO "SongRequestConfig" ("channelId", "guildId")
SELECT DISTINCT ON ("userId") "userId", "guildId"
FROM "TwitchAuth"
ORDER BY "userId", "createdAt", "guildId";

CREATE TABLE "TwitchBotAccount" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "scope" TEXT NOT NULL,
    CONSTRAINT "TwitchBotAccount_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TwitchBotAccount_singleton" CHECK ("id" = 1)
);
