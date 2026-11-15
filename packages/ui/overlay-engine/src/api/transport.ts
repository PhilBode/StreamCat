export type OverlayRequest = <T>(path: string, options?: RequestInit, fallback?: string) => Promise<T>

export function postJson(body: unknown, signal?: AbortSignal): RequestInit {
    return {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(body), signal}
}

export function isAuthError(cause: unknown): boolean {
    if (typeof cause !== "object" || cause === null || !("status" in cause)) return false
    const status = (cause as {status?: unknown}).status
    return status === 401 || status === 403
}
