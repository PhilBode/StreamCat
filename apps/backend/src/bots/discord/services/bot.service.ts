import {parseCustomId} from "../interactions/custom-id"
import {Inject, Injectable, OnApplicationBootstrap, OnApplicationShutdown} from "@nestjs/common"
import {ButtonInteraction, Client, StringSelectMenuInteraction, type Interaction} from "discord.js"
import {CommandManagerService} from "./command-manager.service"
import {GuildConfigRepository} from "@streamcat/db"
import {GuildInitService} from "./guild-init.service"
import {SpotifyService} from "../../../integrations/spotify/spotify.service"
import {TwitchBot} from "../../twitch/twitch-bot"
import {RuntimeService} from "../../../runtime/runtime.service"
import type {ButtonHandler, SelectMenuHandler} from "../interactions/interaction.types"
import {BUTTON_HANDLERS, SELECT_MENU_HANDLERS} from "../interactions/interaction.types"
import {BotLoggerService, errorDetails, type ModuleLogger, requireEnv} from "@streamcat/core"
import {createErrorEmbed, sendErrorEmbed} from "../embed/embed-error-handler"

@Injectable()
export class BotService implements OnApplicationBootstrap, OnApplicationShutdown {
    private readonly buttonHandlers = new Map<string, ButtonHandler>()
    private readonly selectMenuHandlers = new Map<string, SelectMenuHandler>()
    private readonly logger: ModuleLogger

    constructor(
        private readonly client: Client,
        private readonly commandManager: CommandManagerService,
        private readonly guildConfigRepo: GuildConfigRepository,
        private readonly guildInit: GuildInitService,
        private readonly spotifyService: SpotifyService,
        private readonly twitchBot: TwitchBot,
        private readonly runtime: RuntimeService,
        @Inject(BUTTON_HANDLERS) private readonly allButtonHandlers: ButtonHandler[],
        @Inject(SELECT_MENU_HANDLERS) private readonly allSelectMenuHandlers: SelectMenuHandler[],
        logger: BotLoggerService
    ) {
        this.logger = logger.forModule("BotService")
        for (const handler of this.allButtonHandlers) {
            this.buttonHandlers.set(handler.prefix, handler)
        }
        for (const handler of this.allSelectMenuHandlers) {
            this.selectMenuHandlers.set(handler.prefix, handler)
        }
    }

    async onApplicationBootstrap() {
        const token = requireEnv("DISCORD_TOKEN")
        this.client.once("clientReady", () => {
            void this.onClientReady().catch((error) => {
                this.logger.error(`Discord startup failed ${errorDetails(error)}`)
            })
        })

        this.client.on("guildCreate", (guild) => {
            this.logger.info(`Joined guild ${guild.name} (${guild.id})`)
            this.guildInit.initialize(guild)
        })

        this.client.on("guildDelete", async (guild) => {
            this.logger.info(`Left guild ${guild.name} (${guild.id})`)
            await this.handleGuildDelete(guild.id, guild.name)
        })

        this.client.on("error", (error) => {
            this.logger.error(`Discord client error ${errorDetails(error)}`)
        })

        this.client.on("interactionCreate", (interaction) => {
            void this.handleInteraction(interaction)
        })

        await this.client.login(token)
        this.logger.info("Bot connecting...")
    }

    private async handleInteraction(interaction: Interaction): Promise<void> {
        try {
            if (!interaction.guild) return
            if (interaction.isChatInputCommand()) {
                await this.commandManager.handleCommand(interaction)
            } else if (interaction.isButton()) {
                await this.dispatchButton(interaction)
            } else if (interaction.isStringSelectMenu()) {
                await this.dispatchSelectMenu(interaction)
            }
        } catch (error) {
            this.logger.error(
                `Discord interaction could not be completed guild=${interaction.guildId} ${errorDetails(error)}`
            )
        }
    }

    async onApplicationShutdown() {
        await this.client.destroy()
    }

    private async onClientReady(): Promise<void> {
        this.logger.info(`Logged in as ${this.client.user?.tag}`)
        try {
            await this.cleanupStaleGuilds()
        } catch (error) {
            this.logger.error(`Stale guild cleanup failed ${errorDetails(error)}`)
        }
        await this.commandManager.registerCommands()
        const guildResults = await Promise.allSettled(
            this.client.guilds.cache.map((guild) => this.guildInit.initialize(guild))
        )
        const failedGuilds = guildResults.filter((result) => result.status === "rejected" || !result.value).length
        if (failedGuilds) {
            this.logger.warn(`Guild initialization incomplete failed=${failedGuilds} total=${guildResults.length}`)
        }
        await this.runtime.startTwitch()
    }

    private async cleanupStaleGuilds(): Promise<void> {
        const guildIds = new Set(this.client.guilds.cache.map((g) => g.id))
        if (guildIds.size === 0) {
            this.logger.warn("Guild cache is empty — skipping stale guild cleanup")
            return
        }

        const allConfigs = await this.guildConfigRepo.findAll()
        let removed = 0
        for (const config of allConfigs) {
            if (!guildIds.has(config.guildId)) {
                await this.guildConfigRepo.delete(config.guildId)
                this.logger.info(`Cleaned up stale guild ${config.guildId} from database`)
                removed++
            }
        }
        if (removed > 0) {
            this.logger.info(`Cleaned up ${removed} stale guild entries from database`)
        }
    }

    private async handleGuildDelete(guildId: string, guildName: string): Promise<void> {
        this.logger.info(`Bot removed from guild ${guildName} (${guildId}), cleaning up...`)
        try {
            const config = await this.guildConfigRepo.findByGuildId(guildId)
            if (config) {
                if (this.spotifyService?.hasGuildInstance(guildId)) {
                    this.spotifyService.removeGuildInstance(guildId)
                }
                if (this.twitchBot) {
                    await this.twitchBot.removeGuildFollows(guildId)
                    await this.twitchBot.removeGuildAuth(guildId)
                }
                await this.guildConfigRepo.delete(guildId)
                this.logger.info(`Cleaned up data for guild ${guildName} (${guildId})`)
            }
        } catch (err) {
            this.logger.error(`Guild cleanup failed guild=${guildId} ${errorDetails(err)}`)
        }
    }

    private async dispatchButton(interaction: ButtonInteraction): Promise<void> {
        const customId = interaction.customId
        const {prefix, action} = parseCustomId(customId)
        const key = action === "cancel" ? "cancel" : `${prefix}:${action}`
        const handler = this.buttonHandlers.get(key)
        if (!handler) return
        try {
            await handler.execute(interaction, customId)
        } catch (error) {
            this.logger.error(
                `Button handler failed handler=${key} guild=${interaction.guildId} ${errorDetails(error)}`
            )
            const embed = createErrorEmbed(error instanceof Error ? error.message : String(error))
            await sendErrorEmbed(interaction, embed)
        }
    }

    private async dispatchSelectMenu(interaction: StringSelectMenuInteraction): Promise<void> {
        const customId = interaction.customId
        for (const [prefix, handler] of this.selectMenuHandlers) {
            if (customId.startsWith(prefix)) {
                try {
                    await handler.execute(interaction, customId, interaction.values)
                } catch (error) {
                    this.logger.error(
                        `Select menu handler failed handler=${prefix} guild=${interaction.guildId} ${errorDetails(error)}`
                    )
                    const embed = createErrorEmbed(error instanceof Error ? error.message : String(error))
                    await sendErrorEmbed(interaction, embed)
                }
                return
            }
        }
    }
}
