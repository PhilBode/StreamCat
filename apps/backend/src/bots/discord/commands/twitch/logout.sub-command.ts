import {Injectable} from "@nestjs/common"
import {ChatInputCommandInteraction} from "discord.js"
import {BotLoggerService, type ModuleLogger} from "@streamcat/core"
import {DiscordAccountLinkingService} from "../../services/account-linking.service"
import type {TwitchSubCommand} from "./twitch-sub-command.interface"

@Injectable()
export class LogoutSubCommand implements TwitchSubCommand {
    readonly name = "logout"
    private readonly logger: ModuleLogger

    constructor(
        botLogger: BotLoggerService,
        private readonly accountLinking: DiscordAccountLinkingService
    ) {
        this.logger = botLogger.forModule("LogoutSubCommand")
    }

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        this.logger.info(`Twitch logout requested guild=${interaction.guildId ?? "DM"} user=${interaction.user.id}`)
        await this.accountLinking.askDisconnect(interaction, "twitch")
    }
}
