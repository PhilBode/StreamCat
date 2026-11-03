import {createHash, createHmac, randomBytes, timingSafeEqual} from "node:crypto"

export const SESSION_COOKIE = "streamcat_session"
export const STATE_COOKIE = "streamcat_oauth"
export const SESSION_SECONDS = 7 * 24 * 60 * 60
export const STATE_SECONDS = 10 * 60

export function sessionHash(token: string): string {
    return createHash("sha256").update(token).digest("hex")
}

export function cookieValue(header: string | undefined, name: string): string | null {
    const item = header?.split(";").find((part) => part.trim().startsWith(`${name}=`))
    if (!item) return null
    try {
        return decodeURIComponent(item.trim().slice(name.length + 1))
    } catch {
        return null
    }
}

export function createLoginState(secret: string, now = Date.now()) {
    const state = randomBytes(32).toString("hex")
    const payload = `${state}.${now + STATE_SECONDS * 1000}`
    const signature = createHmac("sha256", secret).update(payload).digest("hex")
    return {state, cookie: `${payload}.${signature}`}
}

export function validLoginState(state: unknown, cookie: string | null, secret: string, now = Date.now()): boolean {
    if (typeof state !== "string" || !cookie) return false
    const [stored, expiry, signature, extra] = cookie.split(".")
    if (
        extra !== undefined ||
        !/^[a-f0-9]{64}$/.test(stored ?? "") ||
        !/^\d+$/.test(expiry ?? "") ||
        !/^[a-f0-9]{64}$/.test(signature ?? "")
    )
        return false
    const expiresAt = Number(expiry)
    if (expiresAt <= now || expiresAt > now + STATE_SECONDS * 1000) return false
    const expected = createHmac("sha256", secret).update(`${stored}.${expiry}`).digest()
    return timingSafeEqual(expected, Buffer.from(signature, "hex")) && state === stored
}

export function isGuildAdmin(guild: {owner?: boolean; permissions?: string}): boolean {
    if (guild.owner === true) return true
    if (!/^\d+$/.test(guild.permissions ?? "")) return false
    return (BigInt(guild.permissions!) & 8n) === 8n
}
