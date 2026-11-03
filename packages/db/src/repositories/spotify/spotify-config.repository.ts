import type {SpotifyConfigInput} from "../../dto/spotify/spotify-config-input"
import type {SpotifyConfigRecord} from "../../models/spotify/spotify-config"
import {Injectable} from "@nestjs/common"
import {PrismaService} from "../../prisma.service"
import {TokenEncryptionService, expiresAtFromNow} from "@streamcat/core"

import type {SpotifyTokenUpdate} from "../../dto/spotify/spotify-token-update"
import type {SpotifyAccountInfo} from "../../models/spotify/spotify-account-info"

@Injectable()
export class SpotifyConfigRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly tokenEncryption: TokenEncryptionService
    ) {}

    countConfiguredAccounts(): Promise<number> {
        return this.prisma.spotifyConfig.count({where: {username: {not: ""}}})
    }

    findAccountInfoByGuildId(guildId: string): Promise<SpotifyAccountInfo | null> {
        return this.prisma.spotifyConfig.findUnique({where: {guildId}, select: {username: true, clientId: true}})
    }

    async findByGuildId(guildId: string): Promise<SpotifyConfigRecord | null> {
        const storedConfig = await this.prisma.spotifyConfig.findUnique({where: {guildId}})
        return storedConfig ? this.decryptRecord(storedConfig) : null
    }

    async findAll(): Promise<SpotifyConfigRecord[]> {
        const storedConfigs = await this.prisma.spotifyConfig.findMany()
        return Promise.all(storedConfigs.map((storedConfig) => this.decryptRecord(storedConfig)))
    }

    async save(guildId: string, config: SpotifyConfigInput): Promise<SpotifyConfigRecord> {
        const expiresAt = expiresAtFromNow(config.expiresIn)
        const clientSecret = await this.tokenEncryption.encrypt(config.clientSecret)
        const accessToken = await this.tokenEncryption.encrypt(config.accessToken)
        const refreshToken = await this.tokenEncryption.encrypt(config.refreshToken)
        const storedConfig = await this.prisma.spotifyConfig.upsert({
            where: {guildId},
            update: {
                clientId: config.clientId,
                username: config.username,
                tokenType: config.tokenType,
                scope: config.scope,
                expiresAt,
                clientSecret,
                accessToken,
                refreshToken
            },
            create: {
                guildId,
                clientId: config.clientId,
                username: config.username,
                tokenType: config.tokenType,
                scope: config.scope,
                expiresAt,
                clientSecret,
                accessToken,
                refreshToken
            }
        })
        return this.decryptRecord(storedConfig)
    }

    async updateTokens(guildId: string, tokens: SpotifyTokenUpdate): Promise<void> {
        await this.prisma.spotifyConfig.update({
            where: {guildId},
            data: {
                accessToken: await this.tokenEncryption.encrypt(tokens.accessToken),
                refreshToken: await this.tokenEncryption.encrypt(tokens.refreshToken),
                expiresAt: expiresAtFromNow(tokens.expiresIn)
            }
        })
    }

    async delete(guildId: string): Promise<void> {
        await this.prisma.spotifyConfig.delete({where: {guildId}})
    }

    private async decryptRecord(storedConfig: SpotifyConfigRecord): Promise<SpotifyConfigRecord> {
        return {
            ...storedConfig,
            clientSecret: await this.tokenEncryption.decrypt(storedConfig.clientSecret),
            accessToken: await this.tokenEncryption.decrypt(storedConfig.accessToken),
            refreshToken: await this.tokenEncryption.decrypt(storedConfig.refreshToken)
        }
    }
}
