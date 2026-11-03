import {Injectable} from "@nestjs/common"
import {TokenEncryptionService} from "@streamcat/core"
import {PrismaService} from "../../prisma.service"
import type {WebSessionRecord} from "../../models/discord/web-session"

@Injectable()
export class WebSessionRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly tokenEncryption: TokenEncryptionService
    ) {}

    async create(session: WebSessionRecord): Promise<void> {
        await this.prisma.webSession.deleteMany({where: {expiresAt: {lte: new Date()}}})
        await this.prisma.webSession.create({
            data: {
                ...session,
                accessToken: await this.tokenEncryption.encrypt(session.accessToken),
                refreshToken: await this.tokenEncryption.encrypt(session.refreshToken)
            }
        })
    }

    async findById(sessionId: string): Promise<WebSessionRecord | null> {
        const session = await this.prisma.webSession.findUnique({where: {id: sessionId}})
        if (!session) return null
        return {
            ...session,
            accessToken: await this.tokenEncryption.decrypt(session.accessToken),
            refreshToken: await this.tokenEncryption.decrypt(session.refreshToken)
        }
    }

    async updateTokens(
        sessionId: string,
        accessToken: string,
        refreshToken: string,
        tokenExpiresAt: Date
    ): Promise<void> {
        await this.prisma.webSession.update({
            where: {id: sessionId},
            data: {
                accessToken: await this.tokenEncryption.encrypt(accessToken),
                refreshToken: await this.tokenEncryption.encrypt(refreshToken),
                tokenExpiresAt
            }
        })
    }

    async delete(sessionId: string): Promise<void> {
        await this.prisma.webSession.deleteMany({where: {id: sessionId}})
    }
}
