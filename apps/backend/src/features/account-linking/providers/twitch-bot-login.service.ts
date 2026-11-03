import {Injectable} from "@nestjs/common"
import type {AuthFlowOptions} from "../services/oauth-flow.service"
import {TwitchOAuthProvider} from "../../../integrations/twitch/auth/twitch-oauth-provider"
import {TWITCH_BOT_SCOPES, TwitchBotAccountService} from "../../../integrations/twitch/auth/twitch-bot-account.service"
import {TwitchChatClient} from "../../../integrations/twitch/chat/twitch-chat-client"

@Injectable()
export class TwitchBotLoginService {
    constructor(
        private readonly provider: TwitchOAuthProvider,
        private readonly account: TwitchBotAccountService,
        private readonly chat: TwitchChatClient
    ) {}

    async createAuthorizationOptions(guildId: string): Promise<Omit<AuthFlowOptions, "userId">> {
        return {
            guildId,
            label: "Twitch",
            scope: "installation",
            provider: this.provider.withScopes(TWITCH_BOT_SCOPES),
            complete: async (result) => {
                await this.account.save(result)
                await this.chat.reconcile()
            }
        }
    }
}
