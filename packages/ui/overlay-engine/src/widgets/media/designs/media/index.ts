import {OVERLAY_COLOR_TEMPLATES} from "@streamcat/interfaces"
import {designFromTemplate} from "../../../shared/design"
import {MediaDesign, mediaColorControls} from "./media"

export const mediaDesign = designFromTemplate(
    "media",
    OVERLAY_COLOR_TEMPLATES.standard,
    MediaDesign,
    mediaColorControls,
    {label: "Medium"}
)
