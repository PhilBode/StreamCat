import type {EditorWidget} from "@streamcat/interfaces"
import type {WidgetModule} from "../types"
import {spotifyArtworkDesign} from "./designs/artwork"
import {SpotifySettings} from "./logic/spotify-settings"
import {SpotifyGlyph} from "./logic/spotify-glyph"

function spotifySummary(widget: EditorWidget) {
    if (widget.type !== "SPOTIFY_NOW_PLAYING" || widget.params.spectralizer !== true) return "Spektrum aus"
    const mode = widget.params.spectrumMode === "simulated" ? "Simuliert" : "Audioeingang"
    const audio =
        widget.params.spectrumMode === "audio" ? ` // Audio: ${widget.params.audioDeviceName || "Standard"}` : ""
    return `Spektrum an // Modus: ${mode}${audio}`
}

export const spotifyModule: WidgetModule = {
    type: "SPOTIFY_NOW_PLAYING",
    label: "Spotify",
    description: "Aktueller Song, Album-Cover und Fortschritt.",
    category: "Audio",
    glyph: SpotifyGlyph,
    addable: true,
    defaultDesign: "artwork",
    designs: {
        artwork: spotifyArtworkDesign
    },
    settings: SpotifySettings,
    sectionLabel: "Audio Einstellungen",
    sectionSummary: spotifySummary,
    titleFor: () => "Currently Playing",
    frame: "widget"
}
