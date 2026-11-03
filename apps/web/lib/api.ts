export class ApiError extends Error {
    constructor(
        public status: number,
        message: string
    ) {
        super(message)
    }
}

export async function apiRequest<T>(
    path: string,
    options: RequestInit = {},
    fallback = "Die Anfrage konnte nicht abgeschlossen werden. Bitte versuche es erneut."
): Promise<T> {
    try {
        const response = await fetch(`/api/backend${path}`, {...options, cache: "no-store"})
        if (!response.ok) {
            let message =
                response.status === 401
                    ? "Bitte melde dich erneut mit Discord an."
                    : response.status === 403
                      ? "Du benötigst Administratorrechte für diesen Server."
                      : fallback
            if ([400, 409, 413, 503].includes(response.status)) {
                const details = (await response.json().catch(() => null)) as {message?: unknown} | null
                if (typeof details?.message === "string" && details.message.length <= 500) message = details.message
            }
            throw new ApiError(response.status, message)
        }
        const body = await response.text()
        try {
            return JSON.parse(body) as T
        } catch {
            console.error(`[API] Invalid JSON response status=${response.status}`)
            throw new ApiError(
                response.status,
                "Der Server hat keine gültigen Daten zurückgegeben. Bitte versuche es erneut."
            )
        }
    } catch (error) {
        if (
            error instanceof ApiError ||
            options.signal?.aborted ||
            (error instanceof Error && error.name === "AbortError")
        )
            throw error
        throw new Error(fallback, {cause: error})
    }
}

export function postJson(body: unknown, signal?: AbortSignal): RequestInit {
    return {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(body), signal}
}
