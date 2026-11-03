import type {TwitchRewardKind} from "@streamcat/interfaces"
import type {TwitchRedemption} from "../../../integrations/twitch/models/twitch-redemption"

export const REDEMPTION_HANDLERS = "REDEMPTION_HANDLERS"

export interface RedemptionOutcome {
    chatReply?: string
    refund?: boolean
}

export interface RedemptionHandler {
    readonly kind: TwitchRewardKind

    handle(context: TwitchRedemption): Promise<RedemptionOutcome>
}
