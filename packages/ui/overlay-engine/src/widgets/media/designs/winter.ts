import {OVERLAY_COLOR_TEMPLATES} from "@streamcat/interfaces"
import {designFromTemplate} from "../../shared/design"
import {MediaDesign, mediaColorControls} from "./media"

export const mediaWinterDesign = designFromTemplate(
    "winter",
    OVERLAY_COLOR_TEMPLATES.winter,
    MediaDesign,
    mediaColorControls
)
