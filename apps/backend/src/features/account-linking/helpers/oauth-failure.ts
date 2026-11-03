export type OAuthFailureReason =
    | "access_denied"
    | "invalid_request"
    | "invalid_client"
    | "invalid_scope"
    | "unauthorized_client"
    | "unsupported_response_type"
    | "server_error"
    | "temporarily_unavailable"
    | "provider_error_unknown"
    | "missing_or_invalid_code"

const PROVIDER_ERRORS: readonly OAuthFailureReason[] = [
    "access_denied",
    "invalid_request",
    "invalid_client",
    "invalid_scope",
    "unauthorized_client",
    "unsupported_response_type",
    "server_error",
    "temporarily_unavailable"
]

export function providerFailureReason(error: unknown): OAuthFailureReason {
    if (typeof error === "string" && PROVIDER_ERRORS.includes(error as OAuthFailureReason)) {
        return error as OAuthFailureReason
    }
    return "provider_error_unknown"
}

export function oauthFailureMessage(provider: "Twitch" | "Spotify", reason?: OAuthFailureReason): string {
    switch (reason) {
        case "access_denied":
            return `${provider} authorization was denied. Please approve access to connect your account.`
        case "missing_or_invalid_code":
            return "The callback did not contain an authorization code. Please start a new login."
        case "server_error":
        case "temporarily_unavailable":
            return `${provider} could not complete authorization (${reason}). Please start a new login and try again.`
        default:
            return `${provider} authorization failed. Please try again.`
    }
}
