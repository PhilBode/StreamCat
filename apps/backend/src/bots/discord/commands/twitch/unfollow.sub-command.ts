import {Injectable} from "@nestjs/common"
import {ChatInputCommandInteraction, MessageFlags} from "discord.js"
import {requireGuild} from "../../helpers/helpers"
import {StreamerFollowService} from "../../../../features/stream-notifications/streamer-follow.service"
import type {TwitchSubCommand} from "./twitch-sub-command.interface"

@Injectable()
export class UnfollowSubCommand implements TwitchSubCommand {
    readonly name = "unfollow"

    constructor(private readonly follows: StreamerFollowService) {}

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const username = interaction.options.getString("username", true)
        const guildId = requireGuild(interaction).id

        await this.follows.unfollowStreamer(guildId, username)
        await interaction.reply({content: `Unfollowed ${username}`, flags: MessageFlags.Ephemeral})
    }
}
