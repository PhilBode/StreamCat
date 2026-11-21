import type {WidgetColorControl, WidgetDesign} from "../../../types"
import {SocialsIconsDesign} from "./icons"

export const socialsIconsControls = [
    {key: "--scene-text", label: "Symbole"},
    {key: "--socials-twitch", label: "Twitch"},
    {key: "--socials-twitter", label: "Twitter"},
    {key: "--socials-discord", label: "Discord"}
] as const satisfies readonly WidgetColorControl[]

export const socialsIconsDesign: WidgetDesign = {
    id: "icons",
    label: "Nur Symbole",
    color: "#ffffff",
    backgroundColor: "transparent",
    tokens: {
        "--socials-twitch": "#9146ff",
        "--socials-twitter": "#1da1f2",
        "--socials-discord": "#5865f2"
    },
    colorControls: socialsIconsControls,
    component: SocialsIconsDesign
}
