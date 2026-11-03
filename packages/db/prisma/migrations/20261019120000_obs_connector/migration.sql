CREATE TABLE "ObsConnection" (
    "guildId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "bindings" JSONB NOT NULL DEFAULT '{}',
    "inventory" JSONB,
    "lastSeenAt" TIMESTAMP(3),
    "command" JSONB,
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ObsConnection_pkey" PRIMARY KEY ("guildId")
);
CREATE UNIQUE INDEX "ObsConnection_tokenHash_key" ON "ObsConnection"("tokenHash");
ALTER TABLE "ObsConnection" ADD CONSTRAINT "ObsConnection_guildId_fkey"
    FOREIGN KEY ("guildId") REFERENCES "GuildConfig"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;
