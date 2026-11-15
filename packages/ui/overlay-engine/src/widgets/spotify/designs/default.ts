import {OVERLAY_COLOR_TEMPLATES} from "@streamcat/interfaces"
import {designFromTemplate} from "../../shared/design"
import {SpotifyArtworkDesign, spotifyArtworkControls} from "./artwork"

export const spotifyDefaultDesign = designFromTemplate(
    "default",
    OVERLAY_COLOR_TEMPLATES.standard,
    SpotifyArtworkDesign,
    spotifyArtworkControls
)
