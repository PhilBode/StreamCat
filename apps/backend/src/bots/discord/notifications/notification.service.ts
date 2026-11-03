import {type GuildConfigRecord, GuildConfigRepository, TwitchConfigRepository} from "@streamcat/db"
import {Injectable} from "@nestjs/common"
import {Client, TextChannel, type MessageMentionOptions} from "discord.js"
import {EmbedFactory} from "../embed/embed-factory"
import {createErrorEmbed} from "../embed/embed-error-handler"
import type {StreamNotificationData} from "@streamcat/interfaces"
import {errorDetails, BotLoggerService} from "@streamcat/core"

@Injectable()
export class NotificationService {
    private readonly logger

    constructor(
        private readonly guildConfigRepo: GuildConfigRepository,
        private readonly twitchConfigRepo: TwitchConfigRepository,
        private readonly client: Client,
        logger: BotLoggerService
    ) {
        this.logger = logger.forModule("NotificationService")
    }

    async sendStreamNotification(twitchUserId: string, data: StreamNotificationData): Promise<void> {
        const entries = await this.twitchConfigRepo.findAllByChannelIdWithGuild(twitchUserId)

        for (const entry of entries) {
            const config = entry.guild.notificationConfig
            const target = entry.mainStream
                ? {channelId: config.liveChannel, template: config.mainStreamNotification}
                : {channelId: config.partnerChannel, template: config.partnerStreamNotification}

            await this.deliver(entry.guild, target, data)
        }
    }

    async sendMainStreamNotificationForGuild(guildId: string, data: StreamNotificationData): Promise<boolean> {
        const guildConfig = await this.guildConfigRepo.findByGuildIdWithNotifications(guildId)
        if (!guildConfig) {
            this.logger.warn(`No notification config found for guild ${guildId}`)
            return false
        }

        return this.deliver(
            guildConfig,
            {
                channelId: guildConfig.notificationConfig.liveChannel,
                template: guildConfig.notificationConfig.mainStreamNotification
            },
            data
        )
    }

    private async deliver(
        guildConfig: GuildConfigRecord,
        target: {channelId: string; template: string},
        data: StreamNotificationData
    ): Promise<boolean> {
        try {
            const channel = await this.safeFetchChannel(target.channelId)
            if (!channel) {
                throw new Error(`channel ${target.channelId} is missing or not text-based`)
            }

            const embed = EmbedFactory.twitchNotification(
                data.title,
                data.url,
                data.username,
                data.profilePictureUrl,
                data.game
            )
            await channel.send({
                content: renderNotificationTemplate(target.template, data),
                embeds: [embed],
                allowedMentions: templateMentions(target.template)
            })
            this.logger.info(`Stream notification sent for ${data.username} in guild ${guildConfig.guildId}`)
            return true
        } catch (error) {
            this.logger.error(
                `Failed to notify ${data.username} in guild ${guildConfig.guildId}: ${errorDetails(error)}`
            )
            await this.reportToLogChannel(
                guildConfig.logChannel,
                `Stream notification for **${data.username}** to <#${target.channelId}> failed. Check channel permissions or try again later.`
            )
            return false
        }
    }

    private async reportToLogChannel(logChannelId: string, message: string): Promise<void> {
        try {
            const logChannel = await this.safeFetchChannel(logChannelId)
            await logChannel?.send({embeds: [createErrorEmbed(message)]})
        } catch (error) {
            this.logger.warn(`Could not report failure to log channel: ${errorDetails(error)}`)
        }
    }

    private async safeFetchChannel(channelId: string): Promise<TextChannel | null> {
        try {
            const channel = await this.client.channels.fetch(channelId)
            return channel?.isTextBased() ? (channel as TextChannel) : null
        } catch (error) {
            this.logger.warn(`Failed to fetch channel ${channelId}: ${errorDetails(error)}`)
            return null
        }
    }
}

export function renderNotificationTemplate(
    template: string,
    data: Pick<StreamNotificationData, "username" | "title" | "game" | "url">
): string {
    const values = {Username: data.username, Title: data.title, Game: data.game ?? "Unknown", Url: data.url}
    return template.replace(/{(Username|Title|Game|Url)}/g, (_match, key: keyof typeof values) =>
        values[key].replaceAll("@", "@\u200b")
    )
}

export function templateMentions(template: string): MessageMentionOptions {
    return {
        parse: /@(?:everyone|here)\b/.test(template) ? ["everyone"] : [],
        users: [...new Set([...template.matchAll(/<@!?(\d+)>/g)].map((match) => match[1]))],
        roles: [...new Set([...template.matchAll(/<@&(\d+)>/g)].map((match) => match[1]))],
        repliedUser: false
    }
}
