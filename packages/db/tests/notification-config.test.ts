import {expect, test} from "bun:test"
import {randomUUID} from "node:crypto"
import {PrismaPg} from "@prisma/adapter-pg"
import {PrismaClient} from "../prisma/generated/client"
import type {PrismaService} from "../src/prisma.service"
import {NotificationConfigRepository} from "../src/repositories/discord/notification-config.repository"

const databaseUrl = process.env.STREAMCAT_TEST_DATABASE_URL
const databaseTest = databaseUrl ? test : test.skip

databaseTest("concurrent notification saves merge settings without overwriting channel defaults", async () => {
    if (!databaseUrl || !new URL(databaseUrl).pathname.startsWith("/streamcat_auth_test"))
        throw new Error("Use a disposable streamcat_auth_test database")
    const db = new PrismaClient({adapter: new PrismaPg({connectionString: databaseUrl})})
    const repository = new NotificationConfigRepository(db as unknown as PrismaService)
    const guildId = randomUUID()
    try {
        await db.guildConfig.create({data: {guildId, logChannel: "log-channel"}})
        await Promise.all([
            repository.save(guildId, {liveChannel: "live-channel"}),
            repository.save(guildId, {partnerChannel: "partner-channel"})
        ])
        const saved = await repository.save(guildId, {mainStreamNotification: "Live: {name}"})
        expect(saved).toMatchObject({
            guildId,
            liveChannel: "live-channel",
            partnerChannel: "partner-channel",
            mainStreamNotification: "Live: {name}"
        })
        expect(await db.notificationConfig.count({where: {guildId}})).toBe(1)
    } finally {
        await db.guildConfig.deleteMany({where: {guildId}})
        await db.$disconnect()
    }
})
