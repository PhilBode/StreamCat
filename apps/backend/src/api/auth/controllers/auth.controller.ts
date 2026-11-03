import {Controller, ForbiddenException, Get, Header, Post, Query, Req, Res, UnauthorizedException} from "@nestjs/common"
import type {CookieOptions, Request, Response} from "express"
import {BotLoggerService, frontendUrl, requireEnv, type ModuleLogger} from "@streamcat/core"
import {DiscordLoginService} from "../discord-login.service"
import {
    cookieValue,
    createLoginState,
    SESSION_COOKIE,
    SESSION_SECONDS,
    STATE_COOKIE,
    STATE_SECONDS,
    validLoginState
} from "../auth-security"

@Controller()
export class AuthController {
    private readonly logger: ModuleLogger

    constructor(
        private readonly login: DiscordLoginService,
        logger: BotLoggerService
    ) {
        this.logger = logger.forModule("DiscordLogin")
    }

    private cookieOptions(): CookieOptions {
        return {httpOnly: true, sameSite: "lax", secure: new URL(frontendUrl()).protocol === "https:", path: "/"}
    }

    @Get("dashboard/auth/login")
    async loginRedirect(@Req() req: Request, @Res() res: Response): Promise<void> {
        res.setHeader("Cache-Control", "no-store")
        if (req.hostname === "localhost" && new URL(frontendUrl()).hostname === "127.0.0.1") {
            res.redirect(`${frontendUrl()}/api/backend/dashboard/auth/login`)
            return
        }
        if (cookieValue(req.headers.cookie, SESSION_COOKIE)) {
            try {
                await this.login.session(req)
                this.logger.info("Existing Discord session resumed")
                res.redirect(`${frontendUrl()}/dashboard`)
                return
            } catch (error) {
                if (!(error instanceof UnauthorizedException)) throw error
                this.logger.info("Discord session invalid or expired; starting a new login")
            }
        }
        const {state, cookie} = createLoginState(requireEnv("AUTH_SECRET"))
        const url = this.login.loginUrl(state)
        res.cookie(STATE_COOKIE, cookie, {...this.cookieOptions(), maxAge: STATE_SECONDS * 1000})
        this.logger.info(`Discord login started callback=${this.login.callbackUrl()}`)
        res.redirect(url)
    }

    @Get(["callback/discord", "dashboard/auth/callback"])
    async callback(
        @Query("code") code: unknown,
        @Query("state") state: unknown,
        @Req() req: Request,
        @Res() res: Response
    ): Promise<void> {
        res.setHeader("Cache-Control", "no-store")
        res.setHeader("Referrer-Policy", "no-referrer")
        const cookie = cookieValue(req.headers.cookie, STATE_COOKIE)
        res.clearCookie(STATE_COOKIE, this.cookieOptions())
        if (!validLoginState(state, cookie, requireEnv("AUTH_SECRET")) || typeof code !== "string" || !code) {
            const reason = this.rejectionReason(req, cookie, code)
            this.logger.warn(`Discord callback rejected reason=${reason}`)
            res.redirect(`${frontendUrl()}/?login=invalid`)
            return
        }
        try {
            const sessionToken = await this.login.completeLogin(code, cookieValue(req.headers.cookie, SESSION_COOKIE))
            res.cookie(SESSION_COOKIE, sessionToken, {...this.cookieOptions(), maxAge: SESSION_SECONDS * 1000})
            res.redirect(`${frontendUrl()}/dashboard`)
        } catch {
            res.redirect(`${frontendUrl()}/?login=failed`)
        }
    }

    private rejectionReason(req: Request, cookie: string | null, code: unknown): string {
        if (req.query.error) return "provider_denied"
        if (!cookie) return "missing_state_cookie"
        if (typeof code !== "string" || !code) return "missing_code"
        return "invalid_or_expired_state"
    }

    @Post("dashboard/auth/logout")
    async logout(@Req() req: Request, @Res() res: Response): Promise<void> {
        if (req.headers.origin !== new URL(frontendUrl()).origin) throw new ForbiddenException("Ungültiger Ursprung.")
        await this.login.logout(req)
        res.clearCookie(SESSION_COOKIE, this.cookieOptions())
        res.setHeader("Cache-Control", "no-store")
        res.redirect(303, frontendUrl())
    }

    @Get("dashboard/me")
    @Header("Cache-Control", "private, no-store")
    async me(@Req() req: Request) {
        const session = await this.login.session(req)
        return {id: session.userId, name: session.name, avatar: session.avatar}
    }
}
