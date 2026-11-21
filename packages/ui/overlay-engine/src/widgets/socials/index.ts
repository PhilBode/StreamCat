import type {EditorWidget} from "@streamcat/interfaces"
import type {WidgetModule} from "../types"
import {socialsIconsDesign} from "./designs/icons"
import {socialsInlineDesign} from "./designs/inline"
import {SocialsGlyph} from "./logic/socials-glyph"
import {SocialsSettings} from "./logic/socials-settings"

function socialsSummary(widget: EditorWidget) {
    if (widget.type !== "SOCIALS") return null
    const values = [widget.params.twitch, widget.params.twitter, widget.params.discord].filter(Boolean)
    return values.length ? values.join(" · ") : "Keine Handles"
}

export const socialsModule: WidgetModule = {
    type: "SOCIALS",
    label: "Socials",
    description: "Twitch-, Twitter- und Discord-Handles.",
    category: "Szene",
    glyph: SocialsGlyph,
    addable: true,
    defaultDesign: "inline",
    designs: {
        inline: socialsInlineDesign,
        icons: socialsIconsDesign
    },
    settings: SocialsSettings,
    sectionLabel: "Socials",
    sectionSummary: socialsSummary,
    nameFor: () => "Socials",
    titleFor: () => "Socials",
    frame: "none"
}
