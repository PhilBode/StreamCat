import {TwitchEventSubManager} from "../../integrations/twitch/eventsub/twitch-event-sub-manager"
import {TwitchChatClient} from "../../integrations/twitch/chat/twitch-chat-client"
import {BadGatewayException, BadRequestException, ConflictException, Injectable} from "@nestjs/common"
import {SongRequestRepository, TwitchAuthRepository} from "@streamcat/db"
import {BotLoggerService, errorDetails, type ModuleLogger} from "@streamcat/core"
import type {SongRequestReward, SongRequestSettings, SongRequestUpdate} from "@streamcat/interfaces"
import {SpotifyService} from "../../integrations/spotify/spotify.service"
import {SongRequestRewardsService} from "./song-request-rewards.service"

export interface SongRequestOutcome {
    success: boolean
    chatReply: string
}

@Injectable()
export class SongRequestService {
    private readonly logger: ModuleLogger

    constructor(
        private readonly requests: SongRequestRepository,
        private readonly auth: TwitchAuthRepository,
        private readonly spotify: SpotifyService,
        logger: BotLoggerService,
        private readonly rewards: SongRequestRewardsService,
        private readonly events: TwitchEventSubManager,
        private readonly chat: TwitchChatClient
    ) {
        this.logger = logger.forModule("SongRequests")
    }

    async getSettings(guildId: string): Promise<SongRequestSettings> {
        const [auth, config, rewardIds] = await Promise.all([
            this.auth.findByGuildId(guildId),
            this.requests.findByGuildId(guildId),
            this.requests.findRewardIdsByGuildId(guildId)
        ])
        const assigned = Boolean(auth && config?.channelId === auth.userId)
        return {
            channelId: auth?.userId ?? null,
            assigned,
            enabled: assigned && Boolean(config?.enabled),
            chatCommandEnabled: config?.chatCommandEnabled ?? true,
            rewardIds
        }
    }

    async getRewards(guildId: string): Promise<SongRequestReward[]> {
        try {
            return await this.rewards.getForGuild(guildId)
        } catch (error) {
            this.logger.warn(`Could not load song request rewards guild=${guildId} ${errorDetails(error)}`)
            throw new BadGatewayException(
                "Twitch-Belohnungen konnten nicht geladen werden. Prüfe die Twitch-Verbindung und versuche es erneut."
            )
        }
    }

    async updateSettings(guildId: string, settings: SongRequestUpdate): Promise<SongRequestSettings> {
        const auth = await this.auth.findByGuildId(guildId)
        if (!auth) throw new BadRequestException("Connect Twitch before configuring song requests.")
        if (settings.rewardIds !== undefined) {
            const rewardIds = [...new Set(settings.rewardIds)]
            settings = {...settings, rewardIds}
            const existing = await this.requests.findRewardIdsByGuildId(guildId)
            const added = rewardIds.filter((id) => !existing.includes(id))
            if (added.length) {
                const rewards = await this.getRewards(guildId)
                if (added.some((id) => !rewards.some((reward) => reward.id === id))) {
                    throw new BadRequestException("Wähle eine vorhandene Twitch-Belohnung mit Texteingabe aus.")
                }
            }
        }
        if (!(await this.requests.saveSettings(guildId, auth.userId, settings))) {
            throw new ConflictException(
                "Another server handles song requests for this Twitch channel, or the Twitch connection has changed."
            )
        }
        this.logger.info(
            `Song request settings updated guild=${guildId} channel=${auth.userId} enabled=${settings.enabled ?? "unchanged"} chatCommandEnabled=${settings.chatCommandEnabled ?? "unchanged"} rewards=${settings.rewardIds?.length ?? "unchanged"}`
        )
        const saved = await this.getSettings(guildId)
        await this.reconcile(guildId)
        return saved
    }

    async setEnabled(guildId: string, enabled: boolean): Promise<SongRequestSettings> {
        const auth = await this.auth.findByGuildId(guildId)
        if (!auth) throw new BadRequestException("Connect Twitch before configuring song requests.")
        if (enabled && !(await this.requests.assignChannel(guildId, auth.userId))) {
            throw new ConflictException("Another server handles song requests for this Twitch channel.")
        }
        const config = await this.requests.findByGuildId(guildId)
        if (config?.channelId === auth.userId) {
            await this.requests.setEnabled(guildId, enabled)
            this.logger.info(
                `Song requests ${enabled ? "enabled" : "disabled"} guild=${guildId} channel=${auth.userId}`
            )
        }
        const saved = await this.getSettings(guildId)
        await this.reconcile(guildId)
        return saved
    }

    private async reconcile(guildId: string): Promise<void> {
        try {
            const auth = await this.auth.findByGuildId(guildId)
            const assignment = await this.requests.findByGuildId(guildId)
            if (auth && assignment?.channelId === auth.userId) {
                this.events.subscribeToRedemption(auth.userId, guildId)
            } else {
                this.events.unsubscribeFromRedemptions(guildId)
            }
        } catch (error) {
            // Settings are already saved; listener recovery handles temporary runtime failures.
            this.logger.error(`Could not update song request listener guild=${guildId} ${errorDetails(error)}`)
        }
        await this.chat.reconcile()
    }

    async request(
        channelId: string,
        content: string,
        expectedGuildId?: string,
        source: "chat" | "redemption" = "chat"
    ): Promise<SongRequestOutcome> {
        let guildId: string | undefined
        try {
            const config = await this.requests.findByChannelId(channelId)
            if (!config) return {success: false, chatReply: "Song requests are not configured for this channel."}
            guildId = config.guildId
            if (expectedGuildId && guildId !== expectedGuildId) {
                return {success: false, chatReply: "Another server handles song requests for this channel."}
            }
            if (!config.enabled) return {success: false, chatReply: "Song requests are currently disabled."}
            if (source === "chat" && !config.chatCommandEnabled)
                return {success: false, chatReply: "The !sr chat command is currently disabled."}
            if (!content.trim()) return {success: false, chatReply: "Use !sr <Spotify link or song title>."}

            // Resolve the current link as well; a channel assignment alone is not valid auth.
            const auth = await this.auth.findByGuildId(config.guildId)
            if (auth?.userId !== channelId) {
                return {success: false, chatReply: "The Twitch connection for song requests needs to be updated."}
            }
            if (!(await this.spotify.ensureGuildInstance(config.guildId))) {
                return {success: false, chatReply: "No Spotify account configured for this server."}
            }
            // An admin may have paused or moved the assignment during token restoration.
            const current = await this.requests.findByChannelId(channelId)
            if (!current?.enabled || current.guildId !== config.guildId) {
                return {success: false, chatReply: "Song requests are currently disabled."}
            }
            if (source === "chat" && !current.chatCommandEnabled)
                return {success: false, chatReply: "The !sr chat command is currently disabled."}
            const result = await this.spotify.tryToAddSongToQueue(content, config.guildId)
            if (!result.success) return {success: false, chatReply: "Couldn't find or queue that song."}
            this.logger.info(`Song queued guild=${config.guildId} channel=${channelId}`)
            return {
                success: true,
                chatReply: `Your song "${result.name}" by ${result.artists.join(", ")} has been added to the queue!`
            }
        } catch (error) {
            this.logger.error(
                `Song request failed guild=${guildId ?? "unassigned"} channel=${channelId} ${errorDetails(error)}`
            )
            return {
                success: false,
                chatReply: "Could not process the song request. Please try again or check the Spotify connection."
            }
        }
    }
}
