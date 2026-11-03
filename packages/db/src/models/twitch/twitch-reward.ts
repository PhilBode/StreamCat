import type {TwitchRewardKind} from "@streamcat/interfaces"

export interface TwitchRewardRecord {
    id: number
    guildId: string
    rewardId: string
    kind: TwitchRewardKind
}
