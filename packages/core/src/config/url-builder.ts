import {PORT} from "../common/constants"

function publicOrigin(): string {
    const url = new URL(process.env.PUBLIC_URL?.trim() || `http://127.0.0.1:${PORT.WEB}`)
    if (
        !["http:", "https:"].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.pathname !== "/" ||
        url.search ||
        url.hash
    ) {
        throw new Error("PUBLIC_URL must be an HTTP(S) origin without a path or credentials")
    }
    if (url.hostname === "localhost") url.hostname = "127.0.0.1"
    return url.origin
}

export function frontendUrl(): string {
    return publicOrigin()
}

export function apiHost(): string {
    return new URL(publicOrigin()).hostname
}

export function twitchCallbackUrl(): string {
    return `${publicOrigin()}/callback/twitch`
}

export function spotifyCallbackUrl(): string {
    return `${publicOrigin()}/callback/spotify`
}
