import type {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder,
    SlashCommandSubcommandsOnlyBuilder
} from "discord.js"

export interface Command {
    data: (SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder) & {
        toJSON(): unknown
        readonly name: string
    }
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>
}

export const COMMANDS = "COMMANDS"
