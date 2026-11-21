import type {WidgetColorControl, WidgetDesign} from "../../../types"
import {TickerDesign} from "./marquee"

export const tickerMarqueeControls = [
    {key: "--scene-text", label: "Text"},
    {key: "--ticker-surface", label: "Fläche"}
] as const satisfies readonly WidgetColorControl[]

export const tickerMarqueeDesign: WidgetDesign = {
    id: "marquee",
    label: "Laufschrift",
    color: "#ffffff",
    backgroundColor: "transparent",
    tokens: {
        "--ticker-surface": "transparent"
    },
    colorControls: tickerMarqueeControls,
    component: TickerDesign
}
