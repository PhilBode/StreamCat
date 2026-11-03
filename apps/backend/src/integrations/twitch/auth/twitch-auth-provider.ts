import {Injectable} from "@nestjs/common"
import {ApiClient} from "@twurple/api"
import {RefreshingAuthProvider} from "@twurple/auth"
import {BotLoggerService, errorDetails, requireEnv, type ModuleLogger} from "@streamcat/core"
import {TwitchAuthRepository} from "@streamcat/db"
import {TwitchScopes} from "./scopes"

@Injectable()
export class TwitchAuthProvider {
    private readonly logger: ModuleLogger

    private authProvider?: RefreshingAuthProvider
    private twitchClient?: ApiClient

    constructor(
        private readonly twitchAuthRepo: TwitchAuthRepository,
        logger: BotLoggerService
    ) {
        this.logger = logger.forModule("Twitch")
    }

    async ensureInitialized(): Promise<{provider: RefreshingAuthProvider; client: ApiClient}> {
        if (this.authProvider) return {provider: this.authProvider, client: this.twitchClient!}

        const clientId = requireEnv("TWITCH_APP_CLIENT_ID")
        const clientSecret = requireEnv("TWITCH_APP_SECRET")

        this.authProvider = new RefreshingAuthProvider({clientId, clientSecret})
        this.authProvider.onRefresh(async (_userId, tokenData) => {
            try {
                await this.twitchAuthRepo.updateTokensByUserId(
                    _userId,
                    tokenData.accessToken,
                    tokenData.refreshToken ?? "",
                    tokenData.expiresIn ?? 0,
                    tokenData.obtainmentTimestamp
                )
            } catch (err) {
                this.logger.error(`Twitch token persistence failed user=${_userId} ${errorDetails(err)}`)
            }
        })
        this.twitchClient = new ApiClient({authProvider: this.authProvider})
        this.logger.info("Twitch auth provider initialized")
        return {provider: this.authProvider, client: this.twitchClient}
    }

    getClient(): ApiClient {
        if (!this.twitchClient) throw new Error("TwitchAuthProvider not initialized")
        return this.twitchClient
    }

    addUser(userId: string, accessToken: string, refreshToken: string, expiresIn: number): void {
        if (!this.authProvider) throw new Error("TwitchAuthProvider not initialized")
        this.authProvider.addUser(userId, {
            accessToken,
            refreshToken,
            expiresIn,
            scope: TwitchScopes.scopes,
            obtainmentTimestamp: Date.now()
        })
    }
}
