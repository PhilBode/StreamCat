import {expect, test} from "bun:test"
import {randomUUID} from "node:crypto"
import {PrismaPg} from "@prisma/adapter-pg"
import {PrismaClient} from "../prisma/generated/client"
import {TokenEncryptionService} from "@streamcat/core"
import {TwitchAuthRepository} from "../src/repositories/twitch/twitch-auth.repository"
import type {PrismaService} from "../src/prisma.service"
import type {TwitchAuthInput} from "../src/dto/twitch/twitch-auth-input"

const databaseUrl = process.env.STREAMCAT_TEST_DATABASE_URL
const databaseTest = databaseUrl ? test : test.skip

databaseTest(
    "Twitch account switch keeps one main streamer, preserves follows and other guilds, resets only changed-account rewards",
    async () => {
        if (!databaseUrl || !new URL(databaseUrl).pathname.startsWith("/streamcat_auth_test"))
            throw new Error("Use a disposable streamcat_auth_test database")
        process.env.AUTH_SECRET = "account-switch-test-only"
        const db = new PrismaClient({adapter: new PrismaPg({connectionString: databaseUrl})})
        const repo = new TwitchAuthRepository(db as unknown as PrismaService, new TokenEncryptionService())
        const guildId = randomUUID()
        const otherId = randomUUID()
        const token = (userId: string, username: string): TwitchAuthInput => ({
            userId,
            username,
            accessToken: "private-access",
            refreshToken: "private-refresh",
            expiresIn: 3600
        })
        try {
            await db.guildConfig.createMany({
                data: [
                    {guildId, logChannel: "test"},
                    {guildId: otherId, logChannel: "test"}
                ]
            })
            await repo.save(guildId, token("old-user", "oldstreamer"))
            await repo.save(otherId, token("other-user", "otherstreamer"))
            await db.twitchReward.createMany({
                data: [
                    {guildId, rewardId: "reward-a", kind: "SPOTIFY_SR"},
                    {guildId: otherId, rewardId: "reward-b", kind: "SPOTIFY_SR"}
                ]
            })
            await repo.save(guildId, token("old-user", "oldstreamer"))
            expect(await db.twitchReward.count({where: {guildId}})).toBe(1)
            await repo.save(guildId, token("old-user", "renamedstreamer"))
            expect(await db.twitchConfig.count({where: {guildId, channelId: "old-user"}})).toBe(1)
            expect(await db.twitchReward.count({where: {guildId}})).toBe(1)
            await repo.save(guildId, token("new-user", "newstreamer"))
            expect(
                (await db.twitchConfig.findMany({where: {guildId, mainStream: true}})).map((c) => c.username)
            ).toEqual(["newstreamer"])
            expect(
                await db.twitchConfig.count({where: {guildId, username: "renamedstreamer", mainStream: false}})
            ).toBe(1)
            expect(await db.twitchReward.count({where: {guildId}})).toBe(0)
            expect(await db.twitchReward.count({where: {guildId: otherId}})).toBe(1)
            expect((await repo.findByGuildId(otherId))?.userId).toBe("other-user")
            const saved = await db.twitchAuth.findUniqueOrThrow({where: {guildId}})
            expect(saved.accessToken).not.toBe("private-access")
            expect(saved.refreshToken).not.toBe("private-refresh")
        } finally {
            await db.guildConfig.deleteMany({where: {guildId: {in: [guildId, otherId]}}})
            await db.$disconnect()
        }
    }
)
