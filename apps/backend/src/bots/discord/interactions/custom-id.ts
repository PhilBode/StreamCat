export const CUSTOM_ID_SEPARATOR = ":"

export interface ParsedCustomId {
    prefix: string
    action: string
    guildId: string
    value: string
}

export function buildCustomId(prefix: string, action: string, guildId: string, value?: string): string {
    return value !== undefined
        ? `${prefix}${CUSTOM_ID_SEPARATOR}${action}${CUSTOM_ID_SEPARATOR}${guildId}${CUSTOM_ID_SEPARATOR}${value}`
        : `${prefix}${CUSTOM_ID_SEPARATOR}${action}${CUSTOM_ID_SEPARATOR}${guildId}`
}

export function parseCustomId(customId: string): ParsedCustomId {
    const parts = customId.split(CUSTOM_ID_SEPARATOR)
    return {
        prefix: parts[0],
        action: parts[1],
        guildId: parts[2],
        value: parts.slice(3).join(CUSTOM_ID_SEPARATOR)
    }
}
