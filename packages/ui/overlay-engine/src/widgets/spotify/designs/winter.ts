import {OVERLAY_COLOR_TEMPLATES} from "@streamcat/interfaces"
import {designFromTemplate} from "../../shared/design"
import {SpotifyArtworkDesign, spotifyArtworkControls} from "./artwork"

export const spotifyWinterDesign = designFromTemplate(
    "winter",
    OVERLAY_COLOR_TEMPLATES.winter,
    SpotifyArtworkDesign,
    spotifyArtworkControls
)
