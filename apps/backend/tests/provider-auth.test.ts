import "reflect-metadata"
import {afterEach, beforeEach, expect, spyOn, test} from "bun:test"
import {BadRequestException, ForbiddenException} from "@nestjs/common"
import type {Client, ChatInputCommandInteraction} from "discord.js"
import {BotLoggerService, spotifyCallbackUrl} from "@streamcat/core"
import type {OAuthProvider} from "@streamcat/interfaces"
import {OAuthFlowService, type AuthFlowOptions} from "../src/features/account-linking/services/oauth-flow.service"
import {GuildAccessService} from "../src/integrations/discord/guild-access.service"
import {DiscordAccountLinkingService} from "../src/bots/discord/services/account-linking.service"
import {SpotifyOAuthProvider} from "../src/integrations/spotify/auth/spotify-oauth-provider"

let admin = true
let persisted = 0
let exchanges = 0
let log: string[]
let flow: OAuthFlowService
const request = async () => ({id: "original-browser", userId: "admin"})
const logger = {
    forModule: () => ({
        info: (m: string) => log.push(m),
        warn: (m: string) => log.push(m),
        error: (m: string) => log.push(m)
    })
} as unknown as BotLoggerService
const client = {
    guilds: {fetch: async () => ({ownerId: "owner", members: {fetch: async () => ({permissions: {has: () => admin}})}})}
} as unknown as Client
const provider: OAuthProvider = {
    getAuthUrl: (state) => `https://provider.example/authorize?state=${state}`,
    exchangeCode: async () => {
        exchanges++
        return {accessToken: "private-token", refreshToken: "private-refresh", expiresIn: 3600, scope: "test"}
    },
    fetchUserInfo: async () => ({userId: "provider-user", username: "Streamer"})
}
function options(guildId = "100"): AuthFlowOptions {
    return {
        guildId,
        userId: "admin",
        provider,
        label: "Spotify",
        complete: async () => {
            persisted++
        }
    }
}
function state(url: string): string {
    return new URL(url).searchParams.get("state")!
}

beforeEach(() => {
    admin = true
    persisted = 0
    exchanges = 0
    log = []
    flow = new OAuthFlowService(logger, new GuildAccessService(client, logger))
})
afterEach(() => flow.onModuleDestroy())

test("completes and applies once; rejects replay and mismatched provider", async () => {
    const pending = await flow.begin(options())
    const query = {state: state(pending.url), code: "authorization-code"}
    await expect(flow.finish("Twitch", query, request)).rejects.toBeInstanceOf(BadRequestException)
    expect(exchanges).toBe(0)
    expect(await flow.finish("Spotify", query, request)).toEqual({success: true, returnTo: undefined})
    expect((await pending.result).username).toBe("Streamer")
    expect(persisted).toBe(1)
    await expect(flow.finish("Spotify", query, request)).rejects.toBeInstanceOf(BadRequestException)
    expect(exchanges).toBe(1)
    expect(log.join("\n")).not.toContain(query.state)
    expect(log.join("\n")).not.toContain("authorization-code")
})

test("rejects expired callbacks before code exchange", async () => {
    const pending = await flow.begin(options())
    const now = spyOn(Date, "now").mockReturnValue(Date.now() + 6 * 60_000)
    try {
        await expect(flow.finish("Spotify", {state: state(pending.url), code: "code"}, request)).rejects.toBeInstanceOf(
            BadRequestException
        )
        expect(exchanges).toBe(0)
    } finally {
        now.mockRestore()
    }
})

test("rejects non-admin initiation and revoked permissions on callback", async () => {
    admin = false
    await expect(flow.begin(options())).rejects.toBeInstanceOf(ForbiddenException)
    admin = true
    const pending = await flow.begin(options())
    admin = false
    expect((await flow.finish("Spotify", {state: state(pending.url), code: "code"}, request)).success).toBe(false)
    expect(exchanges).toBe(0)
    expect(persisted).toBe(0)
    await expect(pending.result).rejects.toThrow()
})

test("binds web flows to the original browser session", async () => {
    const pending = await flow.begin({...options(), sessionId: "original-browser"})
    const wrongBrowser = async () => ({id: "other-browser", userId: "admin"})
    expect((await flow.finish("Spotify", {state: state(pending.url), code: "code"}, wrongBrowser)).success).toBe(false)
    expect(exchanges).toBe(0)
})

test("does not report success when persistence or runtime application fails", async () => {
    const pending = await flow.begin({
        ...options(),
        complete: async () => {
            throw new Error("private-token private-secret")
        }
    })
    expect((await flow.finish("Spotify", {state: state(pending.url), code: "code"}, request)).success).toBe(false)
    await expect(pending.result).rejects.toThrow()
    expect(log.join("\n")).toContain("stage=persist_and_apply")
    expect(log.join("\n")).not.toContain("private-token")
    expect(log.join("\n")).not.toContain("private-secret")
})

test("a newer flow for the same guild replaces the old link", async () => {
    const old = await flow.begin(options())
    const current = await flow.begin(options())
    await expect(old.result).rejects.toThrow("A new login")
    await expect(flow.finish("Spotify", {state: state(old.url), code: "code"}, request)).rejects.toThrow()
    expect((await flow.finish("Spotify", {state: state(current.url), code: "code"}, request)).success).toBe(true)
    expect(persisted).toBe(1)
})

test("parallel Spotify guild flows keep their own app credentials", async () => {
    const oauth = new SpotifyOAuthProvider()
    const a = oauth.withCredentials("a".repeat(32), "secret-a")
    const b = oauth.withCredentials("b".repeat(32), "secret-b")
    const credentials: string[] = []
    const fetch = spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
        credentials.push(
            Buffer.from(String((init?.headers as Record<string, string>).Authorization).slice(6), "base64").toString()
        )
        return Response.json({access_token: "access", refresh_token: "refresh", expires_in: 3600})
    })
    try {
        expect(new URL(a.getAuthUrl("state-a")).searchParams.get("client_id")).toBe("a".repeat(32))
        expect(new URL(b.getAuthUrl("state-b")).searchParams.get("client_id")).toBe("b".repeat(32))
        await Promise.all([a.exchangeCode("code-a"), b.exchangeCode("code-b")])
        expect(credentials.sort()).toEqual(["a".repeat(32) + ":secret-a", "b".repeat(32) + ":secret-b"])
    } finally {
        fetch.mockRestore()
    }
})

test("logs provider denial distinctly, without exchanging or exposing callback data", async () => {
    const pending = await flow.begin(options())
    const result = await flow.finish(
        "Spotify",
        {
            state: state(pending.url),
            error: "access_denied",
            error_description: "private-description",
            code: "private-code"
        },
        request
    )
    expect(result.success).toBe(false)
    expect(result.reason).toBe("access_denied")
    expect(exchanges).toBe(0)
    expect(persisted).toBe(0)
    await expect(pending.result).rejects.toThrow("authorization was denied")
    expect(log.join("\n")).toContain("stage=callback_validation status=400 reason=access_denied")
    expect(log.join("\n")).not.toContain("private-description")
    expect(log.join("\n")).not.toContain("private-code")
})

test("distinguishes missing codes from unknown provider errors and redacts unknown values", async () => {
    const missing = await flow.begin(options())
    expect((await flow.finish("Spotify", {state: state(missing.url)}, request)).reason).toBe("missing_or_invalid_code")
    const unknown = await flow.begin(options())
    expect((await flow.finish("Spotify", {state: state(unknown.url), error: "private-secret"}, request)).reason).toBe(
        "provider_error_unknown"
    )
    expect(exchanges).toBe(0)
    expect(log.join("\n")).not.toContain("private-secret")
})

test("Discord authorization keeps the original English prompt", async () => {
    let show!: (content: string) => void
    const shown = new Promise<string>((resolve) => {
        show = resolve
    })
    const interaction = {
        guildId: "100",
        user: {id: "admin"},
        deferReply: async () => {},
        editReply: async ({content}: {content: string}) => {
            show(content)
        }
    } as unknown as ChatInputCommandInteraction
    const {userId, ...discordOptions} = options()
    const completed = new DiscordAccountLinkingService(flow).startOAuth(interaction, discordOptions)
    const content = await shown
    expect(content).toStartWith("**Authorize Spotify for this server**")
    expect(content).toContain("[Open this link]")
    expect(content).toContain("After authorizing, come back here and I'll confirm!")
    const url = content.match(/\[Open this link\]\(([^)]+)\)/)![1]
    await flow.finish("Spotify", {state: state(url), code: "code"}, request)
    await completed
})

test("Spotify server errors explain provider failure without exchanging or saving tokens", async () => {
    const pending = await flow.begin(options())
    const result = await flow.finish("Spotify", {state: state(pending.url), error: "server_error"}, request)
    expect(result).toMatchObject({success: false, reason: "server_error"})
    await expect(pending.result).rejects.toThrow("Spotify could not complete authorization (server_error)")
    expect(exchanges).toBe(0)
    expect(persisted).toBe(0)
    expect(log.join("\n")).toContain("reason=server_error")
})

test("Spotify authorization preserves the original wire URL and UUID state format", async () => {
    const clientId = "a".repeat(32)
    const pending = await flow.begin({
        ...options(),
        provider: new SpotifyOAuthProvider().withCredentials(clientId, "test-secret")
    })
    const nonce = state(pending.url)
    expect(nonce).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    const scopes =
        "user-read-email user-read-private playlist-read-private playlist-read-collaborative user-modify-playback-state user-read-currently-playing user-read-playback-state"
    const previousUrl = `https://accounts.spotify.com/authorize?client_id=${encodeURIComponent(clientId)}&response_type=code&redirect_uri=${encodeURIComponent(spotifyCallbackUrl())}&state=${encodeURIComponent(nonce)}&scope=${encodeURIComponent(scopes)}`
    expect(pending.url).toBe(previousUrl)
    expect(pending.url).not.toContain("+")
})
