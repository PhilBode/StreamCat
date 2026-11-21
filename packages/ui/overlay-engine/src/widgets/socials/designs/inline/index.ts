import type {WidgetColorControl, WidgetDesign} from "../../../types"
import {SocialsInlineDesign} from "./inline"

export const socialsInlineControls = [
    {key: "--scene-text", label: "Text"},
    {key: "--socials-twitch", label: "Twitch"},
    {key: "--socials-twitter", label: "Twitter"},
    {key: "--socials-discord", label: "Discord"}
] as const satisfies readonly WidgetColorControl[]

export const socialsInlineDesign: WidgetDesign = {
    id: "inline",
    label: "Mit Text",
    color: "#ffffff",
    backgroundColor: "transparent",
    tokens: {
        "--socials-twitch": "#9146ff",
        "--socials-twitter": "#1da1f2",
        "--socials-discord": "#5865f2"
    },
    colorControls: socialsInlineControls,
    component: SocialsInlineDesign
}
