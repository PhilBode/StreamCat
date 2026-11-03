import type {Guild} from "discord.js"

export class RequireServerAdminException extends Error {
    constructor(guild?: Guild | null) {
        const server = guild ? `for server ${guild.name}` : ""
        super(`Only server owners and administrators can perform this action ${server}.`)
    }
}
