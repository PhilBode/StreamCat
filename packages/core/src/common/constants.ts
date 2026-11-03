export const COLORS = {
    TWITCH_PURPLE: 0x9146ff,
    BLURPLE: 0x5865f2,
    DARK: 0x2f3136,
    SPOTIFY_GREEN: 0x1db954,
    ERROR_RED: 0xff0000
} as const

export const PORT = {
    WEB: 3000,
    BACKEND: 3002
} as const

export const URLS = {
    TWITCH_PREVIEW: (username: string) =>
        `https://static-cdn.jtvnw.net/previews-ttv/live_user_${username.toLowerCase()}-1280x720.jpg`,
    SPOTIFY_DASHBOARD: "https://developer.spotify.com/dashboard/login"
} as const

export const PLACEHOLDERS = {
    USERNAME: /{Username}/g,
    TITLE: /{Title}/g,
    GAME: /{Game}/g,
    URL: /{Url}/g
} as const

export {versionLabel as EMBED_FOOTER} from "../version"
