import {Controller, Get, Query, Req, Res} from "@nestjs/common"
import type {Request, Response} from "express"
import {OAuthFlowService} from "../../../features/account-linking/services/oauth-flow.service"
import {errorPage, successPage} from "../pages/oauth-pages"
import {oauthFailureMessage} from "../../../features/account-linking/helpers/oauth-failure"
import {DiscordLoginService} from "../discord-login.service"

@Controller()
export class ProviderCallbacksController {
    constructor(
        private readonly oauthFlow: OAuthFlowService,
        private readonly login: DiscordLoginService
    ) {}

    @Get("callback/twitch")
    async twitchCallback(@Query() query: Record<string, string>, @Req() req: Request, @Res() res: Response) {
        await this.respond(req, res, query, "Twitch")
    }

    @Get("callback/spotify")
    async spotifyCallback(@Query() query: Record<string, string>, @Req() req: Request, @Res() res: Response) {
        await this.respond(req, res, query, "Spotify")
    }

    private async respond(
        req: Request,
        res: Response,
        query: Record<string, string>,
        label: "Twitch" | "Spotify"
    ): Promise<void> {
        res.setHeader("Cache-Control", "no-store")
        res.setHeader("Referrer-Policy", "no-referrer")
        try {
            const result = await this.oauthFlow.finish(label, query, () => this.login.session(req))
            if (result.returnTo) {
                const url = new URL(result.returnTo)
                url.searchParams.set("connection", label.toLowerCase())
                url.searchParams.set("result", result.success ? "success" : "failed")
                if (result.reason) url.searchParams.set("reason", result.reason)
                res.redirect(url.toString())
            } else if (result.success) {
                res.type("html").send(successPage(label))
            } else {
                const message = oauthFailureMessage(label, result.reason)
                res.status(400).type("html").send(errorPage(label, message))
            }
        } catch {
            res.status(400).type("html").send(errorPage(label, "Invalid or expired login. Please start a new login."))
        }
    }
}
