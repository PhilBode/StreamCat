import {CanActivate, ExecutionContext, ForbiddenException, Injectable} from "@nestjs/common"
import {frontendUrl} from "@streamcat/core"
import {DiscordLoginService} from "../discord-login.service"
import type {AuthenticatedRequest} from "../models/authenticated-request"

@Injectable()
export class SessionGuard implements CanActivate {
    constructor(private readonly login: DiscordLoginService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
        if (
            !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
            request.headers.origin !== new URL(frontendUrl()).origin
        ) {
            throw new ForbiddenException("Ungültiger Ursprung.")
        }
        request.session = await this.login.session(request)
        return true
    }
}
