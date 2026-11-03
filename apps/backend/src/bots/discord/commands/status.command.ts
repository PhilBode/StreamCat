import {TwitchEventSubManager} from "../../../integrations/twitch/eventsub/twitch-event-sub-manager"
import {Injectable} from "@nestjs/common"
import {ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder} from "discord.js"
import {EmbedFactory} from "../embed/embed-factory"
import {GuildConfigRepository, SpotifyConfigRepository, TwitchConfigRepository} from "@streamcat/db"
import {requireGuild} from "../helpers/helpers"
import {SpotifyService} from "../../../integrations/spotify/spotify.service"
import type {Command} from "./command.types"
import {versionInfo} from "@streamcat/core"

@Injectable()
export class StatusCommand implements Command {
    readonly data = new SlashCommandBuilder()
        .setName("status")
        .setDescription("Show the current server status and configuration")

    constructor(
        private spotifyService: SpotifyService,
        private guildConfigRepo: GuildConfigRepository,
        private twitchConfigRepo: TwitchConfigRepository,
        private spotifyConfigRepo: SpotifyConfigRepository,
        private readonly eventSub: TwitchEventSubManager
    ) {}

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply({flags: MessageFlags.Ephemeral})
        const guild = requireGuild(interaction)
        const guildId = guild.id

        const [config, streams, spotifyConfig] = await Promise.all([
            this.guildConfigRepo.findByGuildIdWithNotifications(guildId),
            this.twitchConfigRepo.findByGuildId(guildId),
            this.spotifyConfigRepo.findAccountInfoByGuildId(guildId)
        ])

        const serverCount = interaction.client.guilds.cache.size
        const spotifyInstanceCount = await this.spotifyConfigRepo.countConfiguredAccounts()
        const fields: {name: string; value: string}[] = []

        if (config) {
            const {liveChannel, partnerChannel} = config.notificationConfig
            fields.push({
                name: "Channels",
                value:
                    `Log: <#${config.logChannel}>\n` +
                    `Live Notifications: <#${liveChannel}>\n` +
                    `Partner Notifications: <#${partnerChannel}>`
            })
        }

        if (spotifyConfig?.username) {
            let playing: string
            try {
                const current = await this.spotifyService.getPlaybackState(guildId)
                playing =
                    current.status === "error"
                        ? "*Error fetching*"
                        : current.status === "playing" || current.status === "paused"
                          ? `🎵 **${current.text}**`
                          : "Nothing currently playing"
            } catch {
                playing = "*Error fetching*"
            }
            fields.push({
                name: "Spotify",
                value: `✅ Connected as **${spotifyConfig.username}**\nCurrently playing: ${playing}`
            })
        } else {
            fields.push({name: "Spotify", value: "❌ Not connected — use `/spotify login`"})
        }

        fields.push({
            name: "Twitch EventSub",
            value: this.eventSub.startupState === "ready" ? "✅ Connected" : "⚠️ Not ready"
        })

        if (streams.length > 0) {
            const streamField = streams
                .map((s) => (s.mainStream ? `\n⭐ **${s.username}** (Main Streamer)` : `\n• ${s.username}`))
                .join("")
            fields.push({name: "Followed Streams", value: streamField})
        }

        fields.unshift({
            name: "Bot",
            value: `Version: **${versionInfo.version}**\nServers: **${serverCount}**\nSpotify instances: **${spotifyInstanceCount}** configured (**${this.spotifyService.instanceCount}** active)`
        })
        const embed = EmbedFactory.serverStatus(guild.name, fields)
        await interaction.editReply({embeds: [embed]})
    }
}
