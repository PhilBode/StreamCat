import {Controller, Get, Header, ServiceUnavailableException} from "@nestjs/common"
import {Client} from "discord.js"
import {healthStatus} from "@streamcat/core"
import {HealthRepository} from "@streamcat/db"

@Controller("health")
export class HealthController {
    constructor(
        private readonly healthRepo: HealthRepository,
        private readonly client: Client
    ) {}

    @Get()
    getHealth() {
        return healthStatus(() => this.healthRepo.ping())
    }

    @Get("ready")
    @Header("Cache-Control", "no-store")
    async getReadiness() {
        const checks: Record<string, unknown> = {}

        try {
            await this.healthRepo.ping()
            checks.database = "ok"
        } catch {
            throw new ServiceUnavailableException({status: "error", timestamp: Date.now(), checks})
        }

        const discordReady = this.client?.isReady() ?? false
        checks.discord = discordReady ? "ok" : "disconnected"

        const allOk = Object.values(checks).every((v) => v === "ok")

        return {
            status: allOk ? "ok" : "degraded",
            checks,
            uptime: process.uptime(),
            timestamp: Date.now()
        }
    }
}
