import "reflect-metadata"
import {expect, test} from "bun:test"
import {TokenEncryptionService} from "@streamcat/core"
import {WebSessionRepository, type WebSessionRecord} from "@streamcat/db"
import type {PrismaService} from "../../../packages/db/src/prisma.service"

test("session repository encrypts tokens at rest and decrypts only on server reads", async () => {
    process.env.AUTH_SECRET = "session-repository-test-secret"
    let stored: WebSessionRecord | null = null
    const prisma = {
        webSession: {
            async deleteMany() {},
            async create({data}: {data: WebSessionRecord}) {
                stored = data
            },
            async findUnique() {
                return stored
            },
            async update({data}: {data: Partial<WebSessionRecord>}) {
                stored = {...stored!, ...data}
            }
        }
    } as unknown as PrismaService
    const repo = new WebSessionRepository(prisma, new TokenEncryptionService())
    const session: WebSessionRecord = {
        id: "hashed-session-id",
        userId: "99",
        name: "Test user",
        avatar: null,
        accessToken: "access-secret",
        refreshToken: "refresh-secret",
        tokenExpiresAt: new Date(Date.now() + 3600_000),
        expiresAt: new Date(Date.now() + 86400_000)
    }
    await repo.create(session)
    expect(JSON.stringify(stored)).not.toContain("access-secret")
    expect(JSON.stringify(stored)).not.toContain("refresh-secret")
    expect(await repo.findById(session.id)).toEqual(session)
    await repo.updateTokens(session.id, "rotated-access", "rotated-refresh", session.tokenExpiresAt)
    expect(JSON.stringify(stored)).not.toContain("rotated-access")
    expect(JSON.stringify(stored)).not.toContain("rotated-refresh")
    expect(await repo.findById(session.id)).toMatchObject({
        accessToken: "rotated-access",
        refreshToken: "rotated-refresh"
    })
})
