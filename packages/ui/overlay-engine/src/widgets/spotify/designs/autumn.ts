import {OVERLAY_COLOR_TEMPLATES} from "@streamcat/interfaces"
import {designFromTemplate} from "../../shared/design"
import {SpotifyArtworkDesign, spotifyArtworkControls} from "./artwork"

export const spotifyAutumnDesign = designFromTemplate(
    "autumn",
    OVERLAY_COLOR_TEMPLATES.autumn,
    SpotifyArtworkDesign,
    spotifyArtworkControls
)
