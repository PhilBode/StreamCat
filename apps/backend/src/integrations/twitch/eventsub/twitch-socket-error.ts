import {errorDetails} from "@streamcat/core"

const closeReasons: Record<number, string> = {
    1000: "normal_closure",
    1001: "going_away",
    1006: "abnormal_closure",
    4000: "twitch_internal_error",
    4001: "unexpected_inbound_traffic",
    4002: "ping_pong_failed",
    4003: "connection_unused",
    4004: "reconnect_grace_expired",
    4005: "network_timeout",
    4006: "network_error",
    4007: "invalid_reconnect"
}

export function twitchSocketErrorDetails(error?: Error): string {
    // The connection library puts the close code in "[4005] ...", not error.code.
    // Log only the numeric code and our own labels; the remote reason may contain secrets.
    const match = error?.message.match(/^\[([1-4]\d{3})\](?:\s|$)/)
    const code = match ? Number(match[1]) : undefined
    const reason = code === undefined ? "not_reported" : (closeReasons[code] ?? "unknown")
    const details = `close_code=${code ?? "unknown"} close_reason=${reason}`
    return error ? `${details} ${errorDetails(error)}` : details
}
