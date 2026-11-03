import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Header,
    HttpCode,
    Param,
    Post,
    UseGuards
} from "@nestjs/common"
import type {FollowedTwitchStreamer} from "@streamcat/interfaces"
import {StreamerFollowService} from "../../../features/stream-notifications/streamer-follow.service"
import {SessionGuard} from "../../auth/guards/session.guard"
import {GuildAdminGuard} from "../../auth/guards/guild-admin.guard"

@Controller("dashboard/guilds/:guildId/twitch/streamers")
@UseGuards(SessionGuard, GuildAdminGuard)
export class TwitchStreamersController {
    constructor(private readonly follows: StreamerFollowService) {}

    @Get()
    @Header("Cache-Control", "private, no-store")
    list(@Param("guildId") guildId: string): Promise<FollowedTwitchStreamer[]> {
        return this.follows.listStreamers(guildId)
    }

    @Post()
    @HttpCode(200)
    @Header("Cache-Control", "private, no-store")
    follow(@Param("guildId") guildId: string, @Body() body: unknown): Promise<FollowedTwitchStreamer> {
        const username = parseUsername(body)
        return this.follows.followStreamer(guildId, username)
    }

    @Delete(":channelId")
    @Header("Cache-Control", "private, no-store")
    async unfollow(@Param("guildId") guildId: string, @Param("channelId") channelId: string) {
        await this.follows.unfollowChannel(guildId, channelId)
        return {channelId}
    }
}

function parseUsername(body: unknown): string {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw new BadRequestException("Gib einen Twitch-Benutzernamen an.")
    }
    const fields = body as Record<string, unknown>
    if (Object.keys(fields).some((key) => key !== "username") || typeof fields.username !== "string") {
        throw new BadRequestException("Gib einen Twitch-Benutzernamen an.")
    }
    const username = fields.username.trim().toLowerCase()
    if (!/^[a-z0-9_]{1,25}$/.test(username)) {
        throw new BadRequestException("Gib einen gültigen Twitch-Benutzernamen ohne URL an.")
    }
    return username
}
