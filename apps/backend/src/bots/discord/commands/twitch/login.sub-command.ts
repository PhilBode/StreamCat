import {Injectable} from "@nestjs/common"
import {ChatInputCommandInteraction} from "discord.js"
import {requireGuild} from "../../helpers/helpers"
import {BotLoggerService, type ModuleLogger} from "@streamcat/core"
import {TwitchAuthRepository} from "@streamcat/db"
import {TwitchHelpersService} from "../twitch-helpers.service"
import type {TwitchSubCommand} from "./twitch-sub-command.interface"

@Injectable()
export class LoginSubCommand implements TwitchSubCommand {
    readonly name = "login"
    private logger: ModuleLogger

    constructor(
        private readonly botLogger: BotLoggerService,
        private readonly twitchAuthRepo: TwitchAuthRepository,
        private readonly helpers: TwitchHelpersService
    ) {
        this.logger = this.botLogger.forModule("LoginSubCommand")
    }

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const guildId = requireGuild(interaction).id

        const existingAuth = await this.twitchAuthRepo.findByGuildId(guildId)
        if (existingAuth) {
            this.logger.info(`Twitch login already exists for guild ${guildId}, prompting reauth`)
            await this.helpers.showReauthPrompt(interaction, guildId, existingAuth.username)
            return
        }

        const result = await this.helpers.startTwitchOAuth(interaction, guildId)
        await this.helpers.sendAuthSuccess(interaction, {username: result.username}, guildId)
    }
}
