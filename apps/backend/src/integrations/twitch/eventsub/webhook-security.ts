import type {NextFunction, Request, Response} from "express"
import {createHmac, timingSafeEqual} from "node:crypto"

export const MAX_WEBHOOK_BYTES = 256 * 1024

export interface TwitchWebhookObservation {
    subscriptionId?: string
    messageType?: string
    bytes: number
    signatureValid: boolean
    ageMs?: number
}

export interface TwitchWebhookGuardOptions {
    secret?: string
    onObserved?: (observation: TwitchWebhookObservation) => void
}

function headerValue(request: Request, name: string): string | undefined {
    const value = request.headers[name]
    return typeof value === "string" ? value : undefined
}

export function createTwitchWebhookGuard(
    options: TwitchWebhookGuardOptions = {}
): (request: Request, response: Response, next: NextFunction) => void {
    return (request, response, next) => {
        if (request.method !== "POST") return next()

        function reject(status: number) {
            response.status(status).set("Connection", "close").end()
            request.socket.destroySoon()
        }

        const signature = request.headers["twitch-eventsub-message-signature"]
        const messageId = request.headers["twitch-eventsub-message-id"]
        const timestamp = request.headers["twitch-eventsub-message-timestamp"]
        if (
            typeof signature !== "string" ||
            !/^sha256=[a-f0-9]{64}$/i.test(signature) ||
            typeof messageId !== "string" ||
            !messageId ||
            messageId.length > 128 ||
            typeof timestamp !== "string" ||
            !Number.isFinite(Date.parse(timestamp))
        ) {
            reject(400)
            return
        }
        if (Number(request.headers["content-length"]) > MAX_WEBHOOK_BYTES) {
            reject(413)
            return
        }

        const observer = options.onObserved
        const hmac =
            observer && options.secret ? createHmac("sha256", options.secret).update(messageId + timestamp) : undefined
        let receivedBytes = 0
        let overflow = false
        function inspectChunk(chunk: Buffer) {
            receivedBytes += chunk.length
            if (receivedBytes > MAX_WEBHOOK_BYTES) {
                overflow = true
                request.removeListener("data", inspectChunk)
                request.pause()
                reject(413)
                return
            }
            hmac?.update(chunk)
        }
        request.prependListener("data", inspectChunk)
        request.once("close", () => request.removeListener("data", inspectChunk))
        if (observer && hmac) {
            request.once("end", () => {
                if (overflow) return
                const expected = Buffer.from(signature.slice("sha256=".length), "hex")
                const actual = hmac.digest()
                const signatureValid = expected.length === actual.length && timingSafeEqual(expected, actual)
                try {
                    observer({
                        subscriptionId: request.path.split("/").filter(Boolean).at(-1),
                        messageType: headerValue(request, "twitch-eventsub-message-type"),
                        bytes: receivedBytes,
                        signatureValid,
                        ageMs: Date.now() - Date.parse(timestamp)
                    })
                } catch {
                    // Observability must never decide whether a webhook succeeds.
                }
            })
        }
        next()
    }
}
