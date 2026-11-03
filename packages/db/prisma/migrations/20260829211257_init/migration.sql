-- CreateEnum
CREATE TYPE "OverlayType" AS ENUM ('STATIC', 'DYNAMIC');

-- CreateEnum
CREATE TYPE "WidgetType" AS ENUM ('SPOTIFY_NOW_PLAYING', 'TWITCH_CHAT');

-- CreateEnum
CREATE TYPE "AssetKind" AS ENUM ('IMAGE', 'VIDEO');

-- CreateTable
CREATE TABLE "GuildConfig" (
    "guildId" TEXT NOT NULL,
    "logChannel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildConfig_pkey" PRIMARY KEY ("guildId")
);

-- CreateTable
CREATE TABLE "NotificationConfig" (
    "guildId" TEXT NOT NULL,
    "liveChannel" TEXT,
    "partnerChannel" TEXT,
    "mainStreamNotification" TEXT,
    "partnerStreamNotification" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationConfig_pkey" PRIMARY KEY ("guildId")
);

-- CreateTable
CREATE TABLE "TwitchConfig" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "mainStream" BOOLEAN NOT NULL DEFAULT false,
    "spotifySr" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TwitchConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TwitchAuth" (
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TwitchAuth_pkey" PRIMARY KEY ("guildId")
);

-- CreateTable
CREATE TABLE "SpotifyConfig" (
    "guildId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "scope" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpotifyConfig_pkey" PRIMARY KEY ("guildId")
);

-- CreateTable
CREATE TABLE "Overlay" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Overlay',
    "token" TEXT NOT NULL,
    "type" "OverlayType" NOT NULL DEFAULT 'DYNAMIC',
    "backgroundAssetId" TEXT,
    "settings" JSONB,
    "customHtml" TEXT,
    "customCss" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Overlay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OverlayWidget" (
    "id" TEXT NOT NULL,
    "overlayId" TEXT NOT NULL,
    "type" "WidgetType" NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "zIndex" INTEGER NOT NULL DEFAULT 0,
    "params" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OverlayWidget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "kind" "AssetKind" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TwitchConfig_guildId_idx" ON "TwitchConfig"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "TwitchConfig_guildId_username_key" ON "TwitchConfig"("guildId", "username");

-- CreateIndex
CREATE UNIQUE INDEX "Overlay_token_key" ON "Overlay"("token");

-- CreateIndex
CREATE INDEX "Overlay_guildId_idx" ON "Overlay"("guildId");

-- CreateIndex
CREATE INDEX "OverlayWidget_overlayId_idx" ON "OverlayWidget"("overlayId");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_storageKey_key" ON "Asset"("storageKey");

-- CreateIndex
CREATE INDEX "Asset_guildId_idx" ON "Asset"("guildId");

-- AddForeignKey
ALTER TABLE "NotificationConfig" ADD CONSTRAINT "NotificationConfig_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "GuildConfig"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TwitchConfig" ADD CONSTRAINT "TwitchConfig_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "GuildConfig"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TwitchAuth" ADD CONSTRAINT "TwitchAuth_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "GuildConfig"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpotifyConfig" ADD CONSTRAINT "SpotifyConfig_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "GuildConfig"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Overlay" ADD CONSTRAINT "Overlay_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "GuildConfig"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Overlay" ADD CONSTRAINT "Overlay_backgroundAssetId_fkey" FOREIGN KEY ("backgroundAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OverlayWidget" ADD CONSTRAINT "OverlayWidget_overlayId_fkey" FOREIGN KEY ("overlayId") REFERENCES "Overlay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "GuildConfig"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;
