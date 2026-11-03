import {GuildAccessService} from "../../../integrations/discord/guild-access.service"
import {Injectable} from "@nestjs/common"
import {ButtonInteraction, MessageFlags} from "discord.js"
import {ButtonHandler} from "./interaction.types"
import {disableRow, parseCustomId, requireInteractionGuild} from "./interaction-utils"
import {GuildConfigRepository, SpotifyConfigRepository} from "@streamcat/db"
import {BotLoggerService} from "@streamcat/core"
import {TwitchBot} from "../../twitch/twitch-bot"
import {SpotifyService} from "../../../integrations/spotify/spotify.service"

@Injectable()
export class SettingsConfirmHandler implements ButtonHandler {
    readonly prefix = "settings:confirm"
    private readonly logger

    constructor(
        private readonly botLogger: BotLoggerService,
        private readonly access: GuildAccessService,
        private readonly guildConfigRepo: GuildConfigRepository,
        private readonly spotifyConfigRepo: SpotifyConfigRepository,
        private readonly twitchBot: TwitchBot,
        private readonly spotifyService: SpotifyService
    ) {
        this.logger = this.botLogger.forModule("SettingsConfirmHandler")
    }

    async execute(interaction: ButtonInteraction, customId: string): Promise<void> {
        const {guildId, value: type} = parseCustomId(customId)
        if (!(await requireInteractionGuild(interaction, guildId))) return
        await interaction.deferUpdate()
        await this.access.requireAdmin(guildId, interaction.user.id)

        switch (type) {
            case "reset-spotify":
                await this.resetSpotify(interaction, guildId)
                break
            case "reset-twitch":
                await this.resetTwitch(interaction, guildId)
                break
            case "reset-server":
                await this.resetServer(interaction, guildId)
                break
            default:
                await interaction.reply({content: "❌ Unknown reset type.", flags: MessageFlags.Ephemeral})
        }
    }

    private async resetSpotify(interaction: ButtonInteraction, guildId: string): Promise<void> {
        await this.deleteSpotifyConfig(guildId)
        this.spotifyService.removeGuildInstance(guildId)
        this.logger.info(`Spotify config reset for guild ${guildId}`)
        await disableRow(
            interaction,
            "✅ Spotify configuration has been reset. Use `/spotify login` to set it up again."
        )
    }

    private async resetTwitch(interaction: ButtonInteraction, guildId: string): Promise<void> {
        await this.twitchBot.removeGuildFollows(guildId)
        await this.twitchBot.removeGuildAuth(guildId)
        this.logger.info(`Twitch config reset for guild ${guildId}`)
        await disableRow(interaction, "✅ All Twitch stream follows have been removed for this server.")
    }

    private async resetServer(interaction: ButtonInteraction, guildId: string): Promise<void> {
        const guild = interaction.guild

        await this.twitchBot.removeGuildFollows(guildId)
        await this.guildConfigRepo.delete(guildId)
        await this.deleteSpotifyConfig(guildId)
        await this.twitchBot.removeGuildAuth(guildId)
        this.spotifyService.removeGuildInstance(guildId)

        this.logger.info(`Server data wiped for guild ${guildId}`)

        await interaction.editReply({
            content: `All data for **${guild?.name ?? guildId}** has been wiped. Goodbye! 👋`,
            components: []
        })
        await guild?.leave()
    }

    private async deleteSpotifyConfig(guildId: string): Promise<void> {
        try {
            await this.spotifyConfigRepo.delete(guildId)
        } catch (error) {
            if ((error as {code?: string} | null)?.code !== "P2025") throw error
            this.logger.debug(`No Spotify config to delete for guild ${guildId}`)
        }
    }
}
