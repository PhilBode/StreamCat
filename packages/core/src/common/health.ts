import {ServiceUnavailableException} from "@nestjs/common"

export async function healthStatus(check: () => Promise<unknown>): Promise<{status: "ok"; timestamp: number}> {
    try {
        await check()
        return {status: "ok", timestamp: Date.now()}
    } catch {
        throw new ServiceUnavailableException({status: "error", timestamp: Date.now()})
    }
}
