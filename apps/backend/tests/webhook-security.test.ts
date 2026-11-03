import "reflect-metadata"
import {afterAll, beforeAll, expect, test} from "bun:test"
import {Module, type INestApplication} from "@nestjs/common"
import {NestFactory} from "@nestjs/core"
import {EventSubMiddleware} from "@twurple/eventsub-http"
import {createHmac} from "node:crypto"
import {request} from "node:http"
import {MAX_WEBHOOK_BYTES, protectTwitchWebhook} from "../src/integrations/twitch/eventsub/webhook-security"

@Module({})
class TestModule {}

const secret = "audit-only-not-a-production-secret"
let app: INestApplication
let origin: string
let verifications = 0

beforeAll(async () => {
    app = await NestFactory.create(TestModule, {logger: false})
    const listener = new EventSubMiddleware({
        managed: false,
        clientId: "audit",
        hostName: "example.com",
        pathPrefix: "eventsub",
        secret,
        strictHostCheck: false
    })
    const subscriptions = (listener as unknown as {_subscriptions: Map<string, unknown>})._subscriptions
    subscriptions.set("audit", {id: "audit", _verify: () => verifications++})
    const router = app.getHttpAdapter().getInstance()
    router.use("/eventsub", protectTwitchWebhook)
    listener.apply(router)
    await app.listen(0, "127.0.0.1")
    origin = await app.getUrl()
})

afterAll(async () => app.close())

function headers(body?: string) {
    const id = "audit-message"
    const timestamp = new Date().toISOString()
    const signature =
        body === undefined
            ? "0".repeat(64)
            : createHmac("sha256", secret)
                  .update(id + timestamp + body)
                  .digest("hex")
    return {
        "Content-Type": "application/json",
        "Twitch-Eventsub-Message-Id": id,
        "Twitch-Eventsub-Message-Timestamp": timestamp,
        "Twitch-Eventsub-Message-Signature": `sha256=${signature}`,
        "Twitch-Eventsub-Message-Type": "webhook_callback_verification"
    }
}

test("rejects unsigned and oversized webhooks while preserving Twurple's raw-body verification", async () => {
    const url = `${origin}/eventsub/event/audit`
    const body = JSON.stringify({challenge: "verified", subscription: {}})
    expect((await fetch(url, {method: "POST", body})).status).toBe(400)
    expect(
        (await fetch(url, {method: "POST", headers: headers(), body: " ".repeat(MAX_WEBHOOK_BYTES + 1)})).status
    ).toBe(413)

    const chunkedStatus = await new Promise<number>((resolve, reject) => {
        const upload = request(url, {method: "POST", headers: headers()}, (response) => {
            response.resume()
            response.once("end", () => resolve(response.statusCode!))
        })
        upload.on("error", reject)
        upload.write(Buffer.alloc(MAX_WEBHOOK_BYTES / 2, 32))
        upload.end(Buffer.alloc(MAX_WEBHOOK_BYTES / 2 + 1, 32))
    })
    expect(chunkedStatus).toBe(413)
    expect(verifications).toBe(0)

    const valid = await fetch(url, {method: "POST", headers: headers(body), body})
    expect(valid.status).toBe(200)
    expect(await valid.text()).toBe("verified")
    expect(verifications).toBe(1)
})
