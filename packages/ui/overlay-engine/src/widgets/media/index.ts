import type {EditorWidget, OverlayAsset} from "@streamcat/interfaces"
import type {WidgetModule} from "../types"
import {mediaDesign} from "./designs/media"
import {MediaGlyph} from "./logic/media-glyph"
import {MediaSettings} from "./logic/media-settings"

function assetName(widget: EditorWidget, assets: OverlayAsset[]) {
    if (widget.type !== "MEDIA" || !widget.params.assetId) return null
    return assets.find((item) => item.id === widget.params.assetId)?.fileName ?? null
}

function mediaSummary(widget: EditorWidget, assets: OverlayAsset[]) {
    if (widget.type !== "MEDIA") return null
    const name = assetName(widget, assets) ?? "Medium"
    const fit = widget.params.fit === "cover" ? "Fläche ausfüllen" : "Ganzes Bild"
    return `${name} - ${fit}`
}

export const mediaModule: WidgetModule = {
    type: "MEDIA",
    label: "Medium",
    description: "Bild oder Video aus der Asset-Bibliothek.",
    category: "Media",
    glyph: MediaGlyph,
    addable: false,
    defaultDesign: "media",
    designs: {
        media: mediaDesign
    },
    settings: MediaSettings,
    sectionLabel: "Bild Einstellungen",
    sectionSummary: mediaSummary,
    nameFor: (widget, assets) => {
        const name = assetName(widget, assets)
        return name ? `Medium · ${name}` : "Medium"
    },
    titleFor: () => "Medium",
    frame: "none"
}
