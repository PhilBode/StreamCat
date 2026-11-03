import {StreamNotificationsModule} from "../../features/stream-notifications/stream-notifications.module"
import {NotificationDraftsService} from "./notifications/notification-drafts.service"
import {SrRewardPageHandler} from "./interactions/sr-reward-page.handler"
import {Module, type Provider, type Type} from "@nestjs/common"
import {PrismaModule} from "@streamcat/db"
import {SpotifyModule} from "../../integrations/spotify/spotify.module"
import {TwitchModule} from "../twitch/twitch.module"
import {DiscordClientModule} from "../../integrations/discord/discord-client.module"
import {AccountLinkingModule} from "../../features/account-linking/account-linking.module"
import {DiscordAccountLinkingService} from "./services/account-linking.service"
import {RuntimeModule} from "../../runtime/runtime.module"
import {BotService} from "./services/bot.service"
import {CommandManagerService} from "./services/command-manager.service"
import {GuildInitService} from "./services/guild-init.service"
import {NotificationsModule} from "./notifications/notifications.module"
import {COMMANDS} from "./commands/command.types"
import {PingCommand} from "./commands/ping.command"
import {BotStatusCommand} from "./commands/bot-status.command"
import {ChannelCommand} from "./commands/channel.command"
import {GlobalCommand} from "./commands/global.command"
import {HelpCommand} from "./commands/help.command"
import {SettingsCommand} from "./commands/settings.command"
import {SpotifyCommand} from "./commands/spotify.command"
import {SongRequestsCommand} from "./commands/song-requests.command"
import {TwitchBotCommand} from "./commands/twitch-bot.command"
import {StatusCommand} from "./commands/status.command"
import {TwitchCommand} from "./commands/twitch.command"
import {TwitchHelpersService} from "./commands/twitch-helpers.service"
import {TWITCH_SUB_COMMANDS} from "./commands/twitch/twitch-sub-command.interface"
import {FollowSubCommand} from "./commands/twitch/follow.sub-command"
import {UnfollowSubCommand} from "./commands/twitch/unfollow.sub-command"
import {SetMessageSubCommand} from "./commands/twitch/set-message.sub-command"
import {PostLiveSubCommand} from "./commands/twitch/post-live.sub-command"
import {LoginSubCommand} from "./commands/twitch/login.sub-command"
import {SetSrRewardSubCommand} from "./commands/twitch/set-sr-reward.sub-command"
import {TrackedSubCommand} from "./commands/twitch/tracked.sub-command"
import {BUTTON_HANDLERS, SELECT_MENU_HANDLERS} from "./interactions/interaction.types"
import {GenericCancelHandler} from "./interactions/generic-cancel.handler"
import {NotificationConfirmHandler} from "./notifications/notification-confirm.handler"
import {ReauthConfirmHandler} from "./interactions/reauth-confirm.handler"
import {SettingsConfirmHandler} from "./interactions/settings-confirm.handler"
import {SrRewardConfirmHandler} from "./interactions/sr-reward-confirm.handler"
import {SrRewardSelectHandler} from "./interactions/sr-reward-select.handler"

const COMMAND_PROVIDERS = [
    PingCommand,
    BotStatusCommand,
    ChannelCommand,
    GlobalCommand,
    HelpCommand,
    SettingsCommand,
    SpotifyCommand,
    SongRequestsCommand,
    TwitchBotCommand,
    StatusCommand,
    TwitchCommand
] as const

const TWITCH_SUB_COMMAND_PROVIDERS = [
    FollowSubCommand,
    UnfollowSubCommand,
    SetMessageSubCommand,
    PostLiveSubCommand,
    LoginSubCommand,
    SetSrRewardSubCommand,
    TrackedSubCommand
] as const

const BUTTON_HANDLER_PROVIDERS = [
    GenericCancelHandler,
    NotificationConfirmHandler,
    ReauthConfirmHandler,
    SettingsConfirmHandler,
    SrRewardConfirmHandler,
    SrRewardPageHandler
] as const

const SELECT_MENU_HANDLER_PROVIDERS = [SrRewardSelectHandler] as const

function collect(token: string, providers: readonly Type<unknown>[]): Provider {
    return {
        provide: token,
        useFactory: (...items: unknown[]) => items,
        inject: [...providers]
    }
}

@Module({
    imports: [
        PrismaModule,
        StreamNotificationsModule,
        NotificationsModule,
        DiscordClientModule,
        AccountLinkingModule,
        RuntimeModule,
        SpotifyModule,
        TwitchModule
    ],
    providers: [
        BotService,
        CommandManagerService,
        GuildInitService,
        DiscordAccountLinkingService,
        ...COMMAND_PROVIDERS,
        TwitchHelpersService,
        NotificationDraftsService,
        ...TWITCH_SUB_COMMAND_PROVIDERS,
        ...BUTTON_HANDLER_PROVIDERS,
        ...SELECT_MENU_HANDLER_PROVIDERS,
        collect(COMMANDS, [...COMMAND_PROVIDERS]),
        collect(TWITCH_SUB_COMMANDS, [...TWITCH_SUB_COMMAND_PROVIDERS]),
        collect(BUTTON_HANDLERS, [...BUTTON_HANDLER_PROVIDERS]),
        collect(SELECT_MENU_HANDLERS, [...SELECT_MENU_HANDLER_PROVIDERS])
    ],
    exports: [DiscordClientModule, NotificationsModule]
})
export class DiscordModule {}
