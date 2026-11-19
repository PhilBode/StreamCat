import {Injectable} from "@nestjs/common"
import {ButtonInteraction} from "discord.js"
import {BotLoggerService, type ModuleLogger} from "@streamcat/core"
import {TwitchConnectionService} from "../../../features/account-linking/providers/twitch-connection.service"
import {SpotifyService} from "../../../integrations/spotify/spotify.service"
import {requireServerAdminOrThrow} from "../helpers/helpers"
import type {ButtonHandler} from "./interaction.types"
import {disableRow, parseCustomId, requireInteractionGuild} from "./interaction-utils"

@Injectable()
export class DisconnectConfirmHandler implements ButtonHandler {
    readonly prefix = "disconnect:confirm"
    private readonly logger: ModuleLogger

    constructor(
        botLogger: BotLoggerService,
        private readonly twitch: TwitchConnectionService,
        private readonly spotify: SpotifyService
    ) {
        this.logger = botLogger.forModule("DisconnectConfirmHandler")
    }

    async execute(interaction: ButtonInteraction, customId: string): Promise<void> {
        const {guildId, value: provider} = parseCustomId(customId)
        if (!(await requireInteractionGuild(interaction, guildId))) return
        await requireServerAdminOrThrow(interaction)
        if (provider !== "twitch" && provider !== "spotify") {
            throw new Error("Unknown connection provider.")
        }

        await interaction.deferUpdate()
        const removed =
            provider === "twitch"
                ? await this.twitch.removeGuildAuth(guildId)
                : await this.spotify.disconnectGuild(guildId)
        const label = provider === "twitch" ? "Twitch" : "Spotify"

        await disableRow(
            interaction,
            removed
                ? `✅ ${label} disconnected. Saved connection data was deleted.`
                : `ℹ️ ${label} was not connected.`
        )
        this.logger.info(`Connection disconnected provider=${provider} guild=${guildId} removed=${removed}`)
    }
}
