import type {NextFunction, Request, Response} from "express"

export const MAX_WEBHOOK_BYTES = 256 * 1024

export function protectTwitchWebhook(request: Request, response: Response, next: NextFunction): void {
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

    let receivedBytes = 0
    function checkSize(chunk: Buffer) {
        receivedBytes += chunk.length
        if (receivedBytes > MAX_WEBHOOK_BYTES) {
            request.removeListener("data", checkSize)
            request.pause()
            reject(413)
        }
    }
    // Observe raw bytes without starting the stream before Twurple attaches its HMAC reader.
    request.prependListener("data", checkSize)
    request.once("close", () => request.removeListener("data", checkSize))
    next()
}
