import {OVERLAY_COLOR_TEMPLATES} from "@streamcat/interfaces"
import {designFromTemplate} from "../../shared/design"
import {MediaDesign, mediaColorControls} from "./media"

export const mediaAutumnDesign = designFromTemplate(
    "autumn",
    OVERLAY_COLOR_TEMPLATES.autumn,
    MediaDesign,
    mediaColorControls
)
