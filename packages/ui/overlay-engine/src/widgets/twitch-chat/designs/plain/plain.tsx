import type {EditorWidget} from "@streamcat/interfaces"
import type {WidgetColorControl, WidgetRenderProps} from "../../../types"
import {TwitchChatContent} from "../../logic/chat-content"
import "./plain.css"

type TwitchChatWidget = Extract<EditorWidget, {type: "TWITCH_CHAT"}>

export const twitchChatPlainControls = [
    {key: "backgroundColor", label: "Hintergrund"}
] as const satisfies readonly WidgetColorControl[]

export function TwitchChatPlainDesign({widget, chat, interactive}: WidgetRenderProps) {
    return (
        <div className="overlay-chat-plain">
            <TwitchChatContent widget={widget as TwitchChatWidget} chat={chat} interactive={interactive} />
        </div>
    )
}
