import {Global, Module} from "@nestjs/common"
import {PrismaService} from "./prisma.service"
import {TwitchConfigRepository} from "./repositories/twitch/twitch-config.repository"
import {TwitchRewardRepository} from "./repositories/twitch/twitch-reward.repository"
import {TwitchAuthRepository} from "./repositories/twitch/twitch-auth.repository"
import {TwitchBotAccountRepository} from "./repositories/twitch/twitch-bot-account.repository"
import {SongRequestRepository} from "./repositories/twitch/song-request.repository"
import {SpotifyConfigRepository} from "./repositories/spotify/spotify-config.repository"
import {GuildConfigRepository} from "./repositories/discord/guild-config.repository"
import {NotificationConfigRepository} from "./repositories/discord/notification-config.repository"
import {OverlayRepository} from "./repositories/overlay/overlay.repository"
import {AssetRepository} from "./repositories/overlay/asset.repository"
import {HealthRepository} from "./repositories/health.repository"
import {WebSessionRepository} from "./repositories/discord/web-session.repository"
import {TokenEncryptionService} from "@streamcat/core"

@Global()
@Module({
    providers: [
        PrismaService,
        TokenEncryptionService,
        WebSessionRepository,
        TwitchBotAccountRepository,
        SongRequestRepository,
        SpotifyConfigRepository,
        GuildConfigRepository,
        TwitchConfigRepository,
        TwitchRewardRepository,
        TwitchAuthRepository,
        NotificationConfigRepository,
        OverlayRepository,
        AssetRepository,
        HealthRepository
    ],
    exports: [
        TwitchBotAccountRepository,
        SongRequestRepository,
        WebSessionRepository,
        SpotifyConfigRepository,
        GuildConfigRepository,
        TwitchConfigRepository,
        TwitchRewardRepository,
        TwitchAuthRepository,
        NotificationConfigRepository,
        OverlayRepository,
        AssetRepository,
        HealthRepository
    ]
})
export class PrismaModule {}
