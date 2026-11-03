import type {TwitchAuthRecord} from "../../models/twitch/twitch-auth"
import {Injectable} from "@nestjs/common"
import {PrismaService} from "../../prisma.service"
import {TokenEncryptionService, expiresAtFromNow} from "@streamcat/core"
import type {TwitchAuthInput} from "../../dto/twitch/twitch-auth-input"
import type {TwitchIdentity} from "../../models/twitch/twitch-identity"

@Injectable()
export class TwitchAuthRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly tokenEncryption: TokenEncryptionService
    ) {}

    findIdentityByGuildId(guildId: string): Promise<TwitchIdentity | null> {
        return this.prisma.twitchAuth.findUnique({where: {guildId}, select: {username: true, userId: true}})
    }

    async findByGuildId(guildId: string): Promise<TwitchAuthRecord | null> {
        const storedAccount = await this.prisma.twitchAuth.findUnique({where: {guildId}})
        return storedAccount ? this.decryptRecord(storedAccount) : null
    }

    async findAll(): Promise<TwitchAuthRecord[]> {
        const storedAccounts = await this.prisma.twitchAuth.findMany()
        return Promise.all(storedAccounts.map((storedAccount) => this.decryptRecord(storedAccount)))
    }

    async save(guildId: string, token: TwitchAuthInput): Promise<TwitchAuthRecord> {
        const accessToken = await this.tokenEncryption.encrypt(token.accessToken)
        const refreshToken = await this.tokenEncryption.encrypt(token.refreshToken)
        const expiresAt = expiresAtFromNow(token.expiresIn)
        const storedAccount = await this.prisma.$transaction(async (transaction) => {
            const previousAccount = await transaction.twitchAuth.findUnique({
                where: {guildId},
                select: {userId: true}
            })

            const savedAccount = await transaction.twitchAuth.upsert({
                where: {guildId},
                update: {
                    userId: token.userId,
                    username: token.username,
                    accessToken,
                    refreshToken,
                    expiresAt
                },
                create: {
                    guildId,
                    userId: token.userId,
                    username: token.username,
                    accessToken,
                    refreshToken,
                    expiresAt
                }
            })

            await transaction.twitchConfig.updateMany({
                where: {guildId, mainStream: true},
                data: {mainStream: false}
            })
            await transaction.twitchConfig.upsert({
                where: {guildId_username: {guildId, username: token.username}},
                update: {channelId: token.userId, mainStream: true},
                create: {guildId, username: token.username, channelId: token.userId, mainStream: true}
            })
            await transaction.twitchConfig.deleteMany({
                where: {guildId, channelId: token.userId, username: {not: token.username}}
            })

            if (previousAccount && previousAccount.userId !== token.userId) {
                await transaction.twitchReward.deleteMany({where: {guildId}})
                await transaction.songRequestConfig.updateMany({where: {guildId}, data: {channelId: null}})
            }

            return savedAccount
        })
        return this.decryptRecord(storedAccount)
    }

    async delete(guildId: string): Promise<void> {
        await this.prisma.$transaction(async (transaction) => {
            await transaction.twitchAuth.deleteMany({where: {guildId}})
            await transaction.twitchReward.deleteMany({where: {guildId}})
            await transaction.songRequestConfig.updateMany({where: {guildId}, data: {channelId: null}})
        })
    }

    async updateTokensByUserId(
        userId: string,
        accessToken: string,
        refreshToken: string,
        expiresIn: number,
        obtainedAt = Date.now()
    ): Promise<void> {
        await this.prisma.twitchAuth.updateMany({
            where: {userId},
            data: {
                accessToken: await this.tokenEncryption.encrypt(accessToken),
                refreshToken: await this.tokenEncryption.encrypt(refreshToken),
                expiresAt: new Date(obtainedAt + expiresIn * 1000)
            }
        })
    }

    private async decryptRecord(storedAccount: TwitchAuthRecord): Promise<TwitchAuthRecord> {
        return {
            ...storedAccount,
            accessToken: await this.tokenEncryption.decrypt(storedAccount.accessToken),
            refreshToken: await this.tokenEncryption.decrypt(storedAccount.refreshToken)
        }
    }
}
