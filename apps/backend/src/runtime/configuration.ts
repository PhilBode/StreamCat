import {databaseUrl, frontendUrl} from "@streamcat/core"

export function checkConfiguration(): void {
    const required = [
        "DISCORD_TOKEN",
        "AUTH_DISCORD_ID",
        "AUTH_DISCORD_SECRET",
        "AUTH_SECRET",
        "TWITCH_APP_CLIENT_ID",
        "TWITCH_APP_SECRET",
        "EVENTSUB_SECRET",
        "S3_ACCESS_KEY_ID",
        "S3_SECRET_ACCESS_KEY"
    ]
    if (!process.env.DATABASE_URL) required.push("DB_PASSWORD")
    const missing = required.filter((name) => !process.env[name]?.trim())
    if (missing.length) throw new Error(`Missing configuration: ${missing.join(", ")}`)
    if (!process.env.PUBLIC_URL?.trim() && process.env.HOST?.trim()) {
        throw new Error(
            "HOST has been replaced by PUBLIC_URL. Set PUBLIC_URL to your full public origin, including https://."
        )
    }
    const origin = new URL(frontendUrl())
    const local =
        origin.hostname.startsWith("127.") ||
        origin.hostname.endsWith(".localhost") ||
        ["localhost", "0.0.0.0", "[::1]", "[::]"].includes(origin.hostname)
    if (origin.protocol !== "https:" || origin.port || local) {
        throw new Error(
            "Live notifications require a public HTTPS PUBLIC_URL on port 443. For local development, point Cloudflared at your local web server."
        )
    }
    databaseUrl()
}
