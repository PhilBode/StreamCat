import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    NotFoundException,
    ServiceUnavailableException
} from "@nestjs/common"
import {Client} from "discord.js"
import {GuildAccessService} from "../../../integrations/discord/guild-access.service"
import {DiscordLoginService} from "../discord-login.service"
import {isGuildAdmin} from "../auth-security"
import type {GuildRequest} from "../models/authenticated-request"

@Injectable()
export class GuildAdminGuard implements CanActivate {
    constructor(
        private readonly client: Client,
        private readonly login: DiscordLoginService,
        private readonly access: GuildAccessService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<GuildRequest>()
        if (!this.client.isReady()) {
            throw new ServiceUnavailableException(
                "Der Discord-Bot verbindet sich gerade. Bitte gleich erneut versuchen."
            )
        }
        const guildId = request.params.guildId as string
        if (!this.client.guilds.cache.has(guildId)) {
            const guilds = await this.login.guilds(request.session)
            const guild = guilds.find((guild) => guild.id === guildId)
            if (!guild || !isGuildAdmin(guild)) {
                throw new ForbiddenException("Nur Serverbesitzer und Administratoren dürfen diesen Server öffnen.")
            }
            throw new NotFoundException("Der Bot ist diesem Server noch nicht beigetreten.")
        }
        request.guildAccess = await this.access.requireAdmin(guildId, request.session.userId)
        return true
    }
}
