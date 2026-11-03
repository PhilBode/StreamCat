-- Keep existing !sr behaviour; channel-point rewards remain independently configurable.
ALTER TABLE "SongRequestConfig" ADD COLUMN "chatCommandEnabled" BOOLEAN NOT NULL DEFAULT true;
