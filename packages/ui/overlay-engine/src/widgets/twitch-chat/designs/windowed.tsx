import {OVERLAY_COLOR_TEMPLATES, type EditorWidget} from "@streamcat/interfaces"
import type {WidgetColorControl, WidgetRenderProps} from "../../types"
import {designFromTemplate} from "../../shared/design"
import {WindowFrame} from "../../shared/window-frame"
import {TwitchChatContent} from "../logic/chat-content"

type TwitchChatWidget = Extract<EditorWidget, {type: "TWITCH_CHAT"}>

export const twitchChatWindowedControls = [
    {key: "color", label: "Textfarbe"},
    {key: "backgroundColor", label: "Hintergrund"}
] as const satisfies readonly WidgetColorControl[]

export function TwitchChatWindowedDesign({widget, chat, interactive, title}: WidgetRenderProps) {
    return (
        <WindowFrame title={title}>
            <TwitchChatContent widget={widget as TwitchChatWidget} chat={chat} interactive={interactive} />
        </WindowFrame>
    )
}

export const twitchChatWindowedDesign = designFromTemplate(
    "windowed",
    OVERLAY_COLOR_TEMPLATES.standard,
    TwitchChatWindowedDesign,
    twitchChatWindowedControls,
    {label: "Mit Fenster"}
)
