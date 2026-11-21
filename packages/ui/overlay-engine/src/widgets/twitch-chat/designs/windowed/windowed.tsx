import type {EditorWidget} from "@streamcat/interfaces"
import type {WidgetColorControl, WidgetRenderProps} from "../../../types"
import {WindowFrame} from "../../../shared/window-frame"
import {TwitchChatContent} from "../../logic/chat-content"
import "./windowed.css"

type TwitchChatWidget = Extract<EditorWidget, {type: "TWITCH_CHAT"}>

export const twitchChatWindowedControls = [
    {key: "color", label: "Titelfarbe"},
    {key: "backgroundColor", label: "Innenfläche"},
    {key: "--window-bg", label: "Rahmen"}
] as const satisfies readonly WidgetColorControl[]

export function TwitchChatWindowedDesign({widget, chat, interactive, title}: WidgetRenderProps) {
    return (
        <WindowFrame title={title}>
            <TwitchChatContent widget={widget as TwitchChatWidget} chat={chat} interactive={interactive} />
        </WindowFrame>
    )
}
