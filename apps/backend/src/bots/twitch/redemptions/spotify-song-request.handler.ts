import {Injectable} from "@nestjs/common"
import {SongRequestService} from "../../../features/song-requests/song-request.service"
import {TwitchRewardKind} from "@streamcat/interfaces"
import type {TwitchRedemption} from "../../../integrations/twitch/models/twitch-redemption"
import type {RedemptionHandler, RedemptionOutcome} from "./redemption-handler.interface"

@Injectable()
export class SpotifySongRequestHandler implements RedemptionHandler {
    readonly kind = TwitchRewardKind.SPOTIFY_SR
    constructor(private readonly requests: SongRequestService) {}

    async handle(ctx: TwitchRedemption): Promise<RedemptionOutcome> {
        const result = await this.requests.request(ctx.broadcasterUserId, ctx.input, ctx.guildId, "redemption")
        return {chatReply: `${ctx.userName}, ${result.chatReply}`, refund: !result.success}
    }
}
