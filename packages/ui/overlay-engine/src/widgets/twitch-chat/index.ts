import type {WidgetModule} from "../types"
import {twitchChatPlainDesign} from "./designs/plain"
import {twitchChatWindowedDesign} from "./designs/windowed"
import {ChatSettings} from "./logic/chat-settings"

export const twitchChatModule: WidgetModule = {
    type: "TWITCH_CHAT",
    label: "Twitch-Chat",
    width: 440,
    height: 560,
    defaultDesign: "windowed",
    designs: {
        windowed: twitchChatWindowedDesign,
        none: twitchChatPlainDesign
    },
    settings: ChatSettings
}
