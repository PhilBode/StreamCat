import type {
    DashboardConnections,
    DashboardGuild,
    DashboardGuildDetails,
    FollowedTwitchStreamer,
    SongRequestReward,
    SongRequestSettings,
    SpotifyQueue
} from "@streamcat/interfaces"
import {DEMO_GUILD_ID, demoPlayback} from "./seed"

const DEMO_GUILD: DashboardGuildDetails = {
    id: DEMO_GUILD_ID,
    name: "StreamCat Demo",
    icon: null,
    owner: true,
    botPresent: true,
    inviteUrl: "#",
    memberCount: 1_842,
    botReady: true
}

const DEMO_REWARDS: SongRequestReward[] = [
    {id: "demo-reward-song", title: "Song Request", cost: 500},
    {id: "demo-reward-vip", title: "Song Request VIP", cost: 1_000}
]

const DEMO_QUEUE: SpotifyQueue = {
    connected: true,
    tracks: [
        {
            uri: "spotify:track:demo-1",
            name: "Midnight Drive",
            artists: ["Demo Artist"],
            coverUrl: null
        },
        {
            uri: "spotify:track:demo-2",
            name: "Neon Rain",
            artists: ["Demo Artist", "Night Cat"],
            coverUrl: null
        },
        {
            uri: "spotify:track:demo-3",
            name: "Afterglow",
            artists: ["Demo Artist"],
            coverUrl: null
        }
    ]
}

let connections: DashboardConnections = {
    twitch: {username: "streamcatdemo"},
    spotify: {username: "Demo DJ", clientId: "demo-client-id"}
}

let songRequests: SongRequestSettings = {
    channelId: "demo-channel",
    assigned: true,
    enabled: true,
    chatCommandEnabled: true,
    rewardIds: ["demo-reward-song"]
}

let streamers: FollowedTwitchStreamer[] = [
    {
        channelId: "demo-streamer-pixelpaule",
        username: "pixelpaule",
        displayName: "Pixel Paule",
        profilePictureUrl: null,
        mainStream: true
    },
    {
        channelId: "demo-streamer-nora",
        username: "nora_streams",
        displayName: "Nora",
        profilePictureUrl: null,
        mainStream: false
    }
]

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: {"Content-Type": "application/json"}
    })
}

function bodyOf(init: RequestInit): Record<string, unknown> {
    if (typeof init.body !== "string") return {}
    try {
        const parsed = JSON.parse(init.body) as unknown
        return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {}
    } catch {
        return {}
    }
}

function addStreamer(body: Record<string, unknown>): FollowedTwitchStreamer | null {
    if (typeof body.username !== "string" || !body.username.trim()) return null
    const username = body.username.trim().toLowerCase()
    const existing = streamers.find((streamer) => streamer.username.toLowerCase() === username)
    if (existing) return existing
    const streamer: FollowedTwitchStreamer = {
        channelId: `demo-streamer-${crypto.randomUUID()}`,
        username,
        displayName: username,
        profilePictureUrl: null,
        mainStream: false
    }
    streamers = [...streamers, streamer]
    return streamer
}

function updateSongRequests(body: Record<string, unknown>): SongRequestSettings {
    songRequests = {
        ...songRequests,
        ...(typeof body.enabled === "boolean" ? {enabled: body.enabled} : {}),
        ...(typeof body.chatCommandEnabled === "boolean" ? {chatCommandEnabled: body.chatCommandEnabled} : {}),
        ...(Array.isArray(body.rewardIds)
            ? {rewardIds: body.rewardIds.filter((value): value is string => typeof value === "string")}
            : {})
    }
    return songRequests
}

function handleApi(path: string, method: string, init: RequestInit): Response {
    const parts = path.split("/").filter(Boolean)
    const body = bodyOf(init)
    const guildPath = parts[0] === "dashboard" && parts[1] === "guilds"

    if (method === "GET" && parts.length === 2 && parts[0] === "dashboard" && parts[1] === "guilds") {
        return jsonResponse([DEMO_GUILD] as DashboardGuild[])
    }

    if (guildPath && parts[2] === DEMO_GUILD_ID) {
        if (method === "GET" && parts.length === 3) return jsonResponse(DEMO_GUILD)

        if (method === "GET" && parts[3] === "connections" && parts.length === 4) {
            return jsonResponse(connections)
        }

        if (method === "DELETE" && parts[3] === "connections" && parts.length === 5) {
            const provider = parts[4]
            if (provider === "twitch" || provider === "spotify") {
                connections = {...connections, [provider]: null}
                return jsonResponse({success: true})
            }
        }

        if (method === "POST" && parts[3] === "connections" && parts.length === 5) {
            return jsonResponse({message: "Im Demo-Modus sind keine echten OAuth-Verbindungen verfügbar."}, 503)
        }

        if (method === "GET" && parts[3] === "song-requests" && parts.length === 4) {
            return jsonResponse(songRequests)
        }

        if (method === "POST" && parts[3] === "song-requests" && parts.length === 4) {
            return jsonResponse(updateSongRequests(body))
        }

        if (method === "GET" && parts[3] === "song-requests" && parts[4] === "rewards" && parts.length === 5) {
            return jsonResponse(DEMO_REWARDS)
        }

        if (method === "GET" && parts[3] === "song-requests" && parts[4] === "queue" && parts.length === 5) {
            return jsonResponse(DEMO_QUEUE)
        }

        if (method === "GET" && parts[3] === "twitch" && parts[4] === "streamers" && parts.length === 5) {
            return jsonResponse(streamers)
        }

        if (method === "POST" && parts[3] === "twitch" && parts[4] === "streamers" && parts.length === 5) {
            const streamer = addStreamer(body)
            return streamer ? jsonResponse(streamer) : jsonResponse({message: "Ungültiger Kanal."}, 400)
        }

        if (method === "DELETE" && parts[3] === "twitch" && parts[4] === "streamers" && parts.length === 6) {
            const channelId = decodeURIComponent(parts[5])
            streamers = streamers.filter((streamer) => streamer.channelId !== channelId)
            return jsonResponse({success: true})
        }

        if (method === "GET" && parts[3] === "overlay" && parts[4] === "preview" && parts.length === 5) {
            return jsonResponse({playback: demoPlayback()})
        }
    }

    return jsonResponse({message: "Diese Demo-API ist nicht verfügbar."}, 404)
}

let installed = false

export function installApiMock(): void {
    if (installed) return
    installed = true
    const originalFetch = window.fetch.bind(window)

    window.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
        const request = input instanceof Request ? input : null
        const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
        const url = new URL(rawUrl, window.location.href)
        if (!url.pathname.startsWith("/api/backend/")) return originalFetch(input, init)

        const signal = init.signal ?? request?.signal
        await new Promise((resolve) => setTimeout(resolve, 120))
        if (signal?.aborted) throw new DOMException("Aborted", "AbortError")

        const method = (init.method ?? request?.method ?? "GET").toUpperCase()
        const path = url.pathname.slice("/api/backend".length)
        return handleApi(path, method, init)
    }) as typeof window.fetch
}
