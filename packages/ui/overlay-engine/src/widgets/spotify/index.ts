import type {WidgetModule} from "../types"
import {spotifyAutumnDesign} from "./designs/autumn"
import {spotifyDefaultDesign} from "./designs/default"
import {spotifyWinterDesign} from "./designs/winter"
import {SpotifySettings} from "./logic/spotify-settings"

export const spotifyModule: WidgetModule = {
    type: "SPOTIFY_NOW_PLAYING",
    label: "Spotify",
    width: 640,
    height: 300,
    defaultDesign: "default",
    designs: {
        default: spotifyDefaultDesign,
        autumn: spotifyAutumnDesign,
        winter: spotifyWinterDesign
    },
    settings: SpotifySettings
}
