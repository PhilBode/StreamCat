import {ForbiddenException, Injectable, ServiceUnavailableException} from "@nestjs/common"
import {Client, PermissionFlagsBits} from "discord.js"
import {BotLoggerService, type ModuleLogger} from "@streamcat/core"

@Injectable()
export class GuildAccessService {
    private readonly logger: ModuleLogger

    constructor(
        private readonly client: Client,
        logger: BotLoggerService
    ) {
        this.logger = logger.forModule("GuildAccess")
    }

    async requireAdmin(guildId: string, userId: string) {
        try {
            const guild = this.client.guilds.cache?.get(guildId) ?? (await this.client.guilds.fetch(guildId))
            const member = await guild.members.fetch({user: userId, force: true})
            const owner = guild.ownerId === userId
            if (!owner && !member.permissions.has(PermissionFlagsBits.Administrator)) {
                throw new ForbiddenException("Only server owners and administrators can manage this server.")
            }
            return {guild, member, owner}
        } catch (error) {
            if (error instanceof ForbiddenException) throw error
            const code = (error as {code?: unknown})?.code
            this.logger.warn(
                `Guild access check failed guild=${guildId} discord_code=${typeof code === "number" ? code : "unknown"}`
            )
            if (code === 10007) {
                throw new ForbiddenException("You are no longer a member of this server.")
            }
            throw new ServiceUnavailableException("Could not verify server permissions. Please try again.")
        }
    }

    async requireInstallationOwner(userId: string): Promise<void> {
        try {
            const application = await this.client.application?.fetch()
            const owner = application?.owner
            const ownerId = owner && "ownerId" in owner ? owner.ownerId : owner?.id
            if (!ownerId || ownerId !== userId) {
                throw new ForbiddenException("Only the bot owner can configure the shared Twitch bot account.")
            }
        } catch (error) {
            if (error instanceof ForbiddenException) throw error
            this.logger.warn("Could not verify Discord application ownership")
            throw new ServiceUnavailableException("Could not verify bot ownership. Please try again.")
        }
    }
}
