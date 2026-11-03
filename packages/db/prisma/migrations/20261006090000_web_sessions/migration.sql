CREATE TABLE "WebSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WebSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WebSession_expiresAt_idx" ON "WebSession"("expiresAt");
