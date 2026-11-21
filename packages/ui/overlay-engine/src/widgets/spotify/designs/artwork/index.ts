import {OVERLAY_COLOR_TEMPLATES} from "@streamcat/interfaces"
import {designFromTemplate} from "../../../shared/design"
import {SpotifyArtworkDesign, spotifyArtworkControls} from "./artwork"

export const spotifyArtworkDesign = designFromTemplate(
    "artwork",
    OVERLAY_COLOR_TEMPLATES.standard,
    SpotifyArtworkDesign,
    spotifyArtworkControls,
    {label: "Artwork"}
)
