-- Keep the browser-source token encrypted so existing scene links can be shown again.
-- Rows created before this migration keep NULL and need one URL reset to get a stored link.
ALTER TABLE "Overlay" ADD COLUMN "browserToken" TEXT;
