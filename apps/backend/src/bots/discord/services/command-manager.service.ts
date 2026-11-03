import {Inject, Injectable} from "@nestjs/common"
import {ChatInputCommandInteraction, Client, REST, Routes} from "discord.js"
import {BotLoggerService, errorDetails, type ModuleLogger, requireEnv} from "@streamcat/core"
import type {Command} from "../commands/command.types"
import {COMMANDS} from "../commands/command.types"
import {createErrorEmbed, sendErrorEmbed} from "../embed/embed-error-handler"

@Injectable()
export class CommandManagerService {
    private logger: ModuleLogger
    private commands = new Map<string, Command>()

    constructor(
        private readonly botLogger: BotLoggerService,
        private readonly client: Client,
        @Inject(COMMANDS) allCommands: Command[]
    ) {
        this.logger = this.botLogger.forModule("CommandManagerService")
        for (const cmd of allCommands) {
            this.commands.set(cmd.data.name, cmd)
            this.logger.debug(`Loaded command: ${cmd.data.name}`)
        }
    }

    async registerCommands(): Promise<boolean> {
        const rest = new REST({version: "10"}).setToken(requireEnv("DISCORD_TOKEN"))
        const commandData = Array.from(this.commands.values()).map((cmd) => cmd.data.toJSON())

        try {
            await rest.put(Routes.applicationCommands(this.client.user!.id), {
                body: commandData
            })
            this.logger.info(`Commands registered count=${commandData.length}`)
            return true
        } catch (error) {
            this.logger.error(`Command registration failed ${errorDetails(error)}`)
            return false
        }
    }

    async handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        const command = this.commands.get(interaction.commandName)
        const guild = interaction.guild
        const guildLabel = guild ? `#${guild.name}(${guild.id})` : "DM"
        this.logger.info(
            `/${interaction.commandName} by ${interaction.user.username}[${interaction.user.id}] in ${guildLabel}`
        )

        try {
            await command?.execute(interaction)
        } catch (error) {
            this.logger.error(
                `Command failed command=${interaction.commandName} guild=${guild?.id ?? "DM"} ${errorDetails(error)}`
            )
            const embed = createErrorEmbed(error instanceof Error ? error.message : String(error))
            await sendErrorEmbed(interaction, embed)
        }
    }
}
