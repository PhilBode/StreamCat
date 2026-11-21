import type {WidgetModule} from "../types"
import {tickerMarqueeDesign} from "./designs/marquee"
import {TickerGlyph} from "./logic/ticker-glyph"
import {TickerSettings} from "./logic/ticker-settings"

export const tickerModule: WidgetModule = {
    type: "TICKER",
    label: "Ticker",
    description: "Laufschrift für Nachrichten, Socials oder Hinweise.",
    category: "Szene",
    glyph: TickerGlyph,
    addable: true,
    defaultDesign: "marquee",
    designs: {
        marquee: tickerMarqueeDesign
    },
    settings: TickerSettings,
    sectionLabel: "Ticker",
    sectionSummary: (widget) => {
        if (widget.type !== "TICKER") return null
        return widget.params.text ? widget.params.text.slice(0, 48) : "Leer"
    },
    nameFor: (widget) => (widget.type === "TICKER" && widget.params.text ? widget.params.text.slice(0, 40) : "Ticker"),
    titleFor: () => "Ticker",
    frame: "none"
}
