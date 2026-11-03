import {Injectable} from "@nestjs/common"
import {expiresAtFromNow, TokenEncryptionService} from "@streamcat/core"
import {PrismaService} from "../../prisma.service"
import type {TwitchBotAccountInput} from "../../dto/twitch/twitch-bot-account-input"
import type {TwitchBotAccountRecord} from "../../models/twitch/twitch-bot-account"

@Injectable()
export class TwitchBotAccountRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly tokenEncryption: TokenEncryptionService
    ) {}

    async findAccount(): Promise<TwitchBotAccountRecord | null> {
        const storedAccount = await this.prisma.twitchBotAccount.findUnique({where: {id: 1}})
        return storedAccount ? this.decryptRecord(storedAccount) : null
    }

    async save(account: TwitchBotAccountInput): Promise<TwitchBotAccountRecord> {
        const username = account.username.toLowerCase()
        const accessToken = await this.tokenEncryption.encrypt(account.accessToken)
        const refreshToken = await this.tokenEncryption.encrypt(account.refreshToken)
        const expiresAt = expiresAtFromNow(account.expiresIn)
        const storedAccount = await this.prisma.twitchBotAccount.upsert({
            where: {id: 1},
            create: {
                id: 1,
                userId: account.userId,
                username,
                accessToken,
                refreshToken,
                expiresAt,
                scope: account.scope
            },
            update: {userId: account.userId, username, accessToken, refreshToken, expiresAt, scope: account.scope}
        })
        return this.decryptRecord(storedAccount)
    }

    async updateTokens(userId: string, accessToken: string, refreshToken: string, expiresIn: number): Promise<void> {
        await this.prisma.twitchBotAccount.updateMany({
            where: {id: 1, userId},
            data: {
                accessToken: await this.tokenEncryption.encrypt(accessToken),
                refreshToken: await this.tokenEncryption.encrypt(refreshToken),
                expiresAt: expiresAtFromNow(expiresIn)
            }
        })
    }

    private async decryptRecord(storedAccount: TwitchBotAccountRecord): Promise<TwitchBotAccountRecord> {
        return {
            ...storedAccount,
            accessToken: await this.tokenEncryption.decrypt(storedAccount.accessToken),
            refreshToken: await this.tokenEncryption.decrypt(storedAccount.refreshToken)
        }
    }
}
