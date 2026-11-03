import {Controller, Get, Header, Req, UseGuards} from "@nestjs/common"
import {SessionGuard} from "../../auth/guards/session.guard"
import {GuildAdminGuard} from "../../auth/guards/guild-admin.guard"
import type {AuthenticatedRequest, GuildRequest} from "../../auth/models/authenticated-request"
import {GuildsService} from "../services/guilds.service"

@Controller("dashboard/guilds")
@UseGuards(SessionGuard)
export class GuildsController {
    constructor(private readonly guilds: GuildsService) {}

    @Get()
    @Header("Cache-Control", "private, no-store")
    list(@Req() request: AuthenticatedRequest) {
        return this.guilds.guilds(request.session)
    }

    @Get(":guildId")
    @UseGuards(GuildAdminGuard)
    @Header("Cache-Control", "private, no-store")
    details(@Req() request: GuildRequest) {
        return this.guilds.guild(request.guildAccess)
    }
}
