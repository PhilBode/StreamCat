import type {EditorWidget} from "@streamcat/interfaces"
import type {WidgetColorControl, WidgetRenderProps} from "../../types"
import {WindowFrame} from "../../shared/window-frame"
import {SpotifyWidget} from "../logic/spotify-widget"

type SpotifyWidgetType = Extract<EditorWidget, {type: "SPOTIFY_NOW_PLAYING"}>

export const spotifyArtworkControls = [
    {key: "color", label: "Textfarbe"},
    {key: "backgroundColor", label: "Innenfläche"},
    {key: "--window-bg", label: "Rahmen"},
    {key: "--progress-color", label: "Fortschritt"}
] as const satisfies readonly WidgetColorControl[]

export function SpotifyArtworkDesign({widget, playback, audioEnabled, title}: WidgetRenderProps) {
    return (
        <WindowFrame title={title}>
            <SpotifyWidget widget={widget as SpotifyWidgetType} playback={playback} audioEnabled={audioEnabled} />
        </WindowFrame>
    )
}
