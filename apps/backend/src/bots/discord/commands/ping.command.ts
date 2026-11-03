import {Injectable} from "@nestjs/common"
import {ChatInputCommandInteraction, SlashCommandBuilder} from "discord.js"
import type {Command} from "./command.types"

@Injectable()
export class PingCommand implements Command {
    readonly data = new SlashCommandBuilder().setName("ping").setDescription("Replies with the current bot latency")

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply()
        const latency = interaction.client.ws.ping
        await interaction.editReply(`🏓 Pong! Latency: **${latency}ms**`)
    }
}
