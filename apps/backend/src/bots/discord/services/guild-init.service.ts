import {Injectable} from "@nestjs/common"
import {ChannelType, EmbedBuilder, Guild, PermissionFlagsBits, TextChannel} from "discord.js"
import {BotLoggerService, COLORS, EMBED_FOOTER, errorDetails, type ModuleLogger} from "@streamcat/core"
import {GuildConfigRepository, NotificationConfigRepository} from "@streamcat/db"

@Injectable()
export class GuildInitService {
    private readonly logger: ModuleLogger

    constructor(
        private readonly guildConfigRepo: GuildConfigRepository,
        private readonly notificationConfigRepo: NotificationConfigRepository,
        logger: BotLoggerService
    ) {
        this.logger = logger.forModule("GuildInitService")
    }

    async initialize(guild: Guild): Promise<boolean> {
        try {
            this.logger.info(`Initializing guild: ${guild.name} (${guild.id})`)

            const existing = await this.guildConfigRepo.findByGuildId(guild.id)
            if (existing) {
                this.logger.info(`Guild ${guild.name} (${guild.id}) found in database, skipping onboarding`)
                return true
            }

            const config = await this.setupGuildConfig(guild)
            await this.sendInitialMessage(guild, config.logChannel)
            this.logger.info(`Guild initialized: ${guild.name} (${guild.id})`)
            return true
        } catch (error) {
            this.logger.error(`Failed to initialize guild ${guild.id} ${errorDetails(error)}`)
            return false
        }
    }

    private async sendInitialMessage(guild: Guild, channelId: string) {
        try {
            const channel = await guild.channels.fetch(channelId).catch(() => null)
            if (channel?.isTextBased()) {
                const embed = new EmbedBuilder()
                    .setColor(COLORS.TWITCH_PURPLE)
                    .setTitle("👋 Welcome to StreamCat!")
                    .setDescription(
                        "Here's how to get started:\n\n" +
                            "**1. Connect your Twitch account**\n" +
                            "Run `/twitch login` to authorize your Twitch account.\n" +
                            "**2. Set up notification channels**\n" +
                            "Use `/channel live` to choose where stream notifications appear.\n\n" +
                            "**3. (Optional) Add Spotify**\n" +
                            "Use `/spotify login` to enable song requests.\n\n" +
                            "**4. See the status**\n" +
                            "Use `/status` to check everything is working."
                    )
                    .setTimestamp()
                    .setFooter({text: EMBED_FOOTER})

                await (channel as TextChannel).send({embeds: [embed]})
            }
        } catch (err) {
            this.logger.warn(`Failed to send init message guild=${guild.id} ${errorDetails(err)}`)
        }
    }

    private async setupGuildConfig(guild: Guild) {
        const channels = Array.from(guild.channels.cache.values())

        const findTextChannelId = (matches: (channelName: string) => boolean) => {
            const channel = channels.find((c) => c.name && matches(c.name.toLowerCase()) && c.isTextBased?.())
            return channel?.id
        }

        const logChannelId = await this.findOrCreateChannel(
            guild,
            findTextChannelId((channelName) => channelName === "log") ||
                findTextChannelId((channelName) => channelName.includes("log")),
            "log",
            "Bot logs and system messages"
        )

        const liveChannelId = await this.findOrCreateChannel(
            guild,
            findTextChannelId((channelName) => channelName.includes("notification")) ||
                findTextChannelId((channelName) => channelName.includes("live")),
            "stream-notifications",
            "Live stream notifications",
            logChannelId
        )

        const config = await this.guildConfigRepo.saveLogChannel(guild.id, logChannelId)
        await this.notificationConfigRepo.save(guild.id, {
            liveChannel: liveChannelId,
            partnerChannel: liveChannelId
        })
        return config
    }

    private async findOrCreateChannel(
        guild: Guild,
        existingChannelId: string | undefined,
        channelName: string,
        channelTopic: string,
        fallbackChannelId?: string
    ): Promise<string> {
        if (existingChannelId) {
            return existingChannelId
        }

        try {
            const created = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                topic: channelTopic,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions],
                        allow: [PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ViewChannel]
                    }
                ]
            })
            this.logger.info(`Created channel #${channelName} in guild ${guild.name}`)
            return created.id
        } catch (err) {
            this.logger.warn(`Could not create channel guild=${guild.id} channel=${channelName} ${errorDetails(err)}`)
            if (fallbackChannelId) {
                return fallbackChannelId
            }
            const foundChannelId = guild.channels.cache.find(
                (c) => c.name === channelName && "isTextBased" in c && c.isTextBased?.()
            )?.id
            if (foundChannelId) {
                return foundChannelId
            }
            throw new Error(`Could not create or find channel #${channelName} in guild ${guild.name}`)
        }
    }
}
