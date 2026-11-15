import {OVERLAY_COLOR_TEMPLATES} from "@streamcat/interfaces"
import {designFromTemplate} from "../../shared/design"
import {MediaDesign, mediaColorControls} from "./media"

export const mediaDefaultDesign = designFromTemplate(
    "default",
    OVERLAY_COLOR_TEMPLATES.standard,
    MediaDesign,
    mediaColorControls
)
