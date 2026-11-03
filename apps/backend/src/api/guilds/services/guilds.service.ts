import type {GuildRequest} from "../../auth/models/authenticated-request"
import {Injectable, ServiceUnavailableException} from "@nestjs/common"
import {Client, PermissionFlagsBits} from "discord.js"
import {BotLoggerService} from "@streamcat/core"
import type {DashboardGuild, DashboardGuildDetails} from "@streamcat/interfaces"
import type {WebSessionRecord} from "@streamcat/db"
import {DiscordLoginService, type DiscordUserGuild} from "../../auth/discord-login.service"
import {isGuildAdmin} from "../../auth/auth-security"

@Injectable()
export class GuildsService {
    constructor(
        private readonly client: Client,
        private readonly login: DiscordLoginService,
        private readonly logger: BotLoggerService
    ) {}

    async guilds(session: WebSessionRecord): Promise<DashboardGuild[]> {
        const guilds = await this.login.guilds(session)
        this.requireReady()
        return guilds.filter(isGuildAdmin).map((guild) => this.summary(guild))
    }

    guild({guild, member, owner}: GuildRequest["guildAccess"]): DashboardGuildDetails {
        return {
            ...this.summary({
                id: guild.id,
                name: guild.name,
                icon: guild.icon,
                owner,
                permissions: member.permissions.bitfield.toString()
            }),
            memberCount: guild.memberCount,
            botReady: this.client.isReady()
        }
    }

    private requireReady(): void {
        if (!this.client.isReady())
            throw new ServiceUnavailableException(
                "Der Discord-Bot verbindet sich gerade. Bitte gleich erneut versuchen."
            )
    }

    private summary(guild: DiscordUserGuild): DashboardGuild {
        const clientId = process.env.AUTH_DISCORD_ID?.trim()
        if (!clientId) {
            this.logger.forModule("Dashboard").error("Discord invite configuration missing: AUTH_DISCORD_ID")
            throw new ServiceUnavailableException("Discord ist noch nicht konfiguriert.")
        }
        const invite = new URL("https://discord.com/oauth2/authorize")
        const permissions =
            PermissionFlagsBits.ViewChannel |
            PermissionFlagsBits.SendMessages |
            PermissionFlagsBits.EmbedLinks |
            PermissionFlagsBits.ManageChannels
        invite.search = new URLSearchParams({
            client_id: clientId,
            scope: "bot applications.commands",
            permissions: permissions.toString(),
            guild_id: guild.id,
            disable_guild_select: "true"
        }).toString()
        return {
            id: guild.id,
            name: guild.name,
            icon: guild.icon,
            owner: guild.owner,
            botPresent: this.client.guilds.cache.has(guild.id),
            inviteUrl: invite.toString()
        }
    }
}
