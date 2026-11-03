-- Preserve existing links while removing retrievable URL secrets from storage.
UPDATE "Overlay" SET "token" = encode(sha256(convert_to("token", 'UTF8')), 'hex');
ALTER TABLE "Overlay" RENAME COLUMN "token" TO "tokenHash";
ALTER INDEX "Overlay_token_key" RENAME TO "Overlay_tokenHash_key";
