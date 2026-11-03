import type {Request} from "express"
import type {Guild, GuildMember} from "discord.js"
import type {WebSessionRecord} from "@streamcat/db"

export interface AuthenticatedRequest extends Request {
    session: WebSessionRecord
}

export interface GuildRequest extends AuthenticatedRequest {
    guildAccess: {guild: Guild; member: GuildMember; owner: boolean}
}
