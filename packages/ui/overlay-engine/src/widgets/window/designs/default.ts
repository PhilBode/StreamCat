import {OVERLAY_COLOR_TEMPLATES} from "@streamcat/interfaces"
import {designFromTemplate} from "../../shared/design"
import {WindowDesign, windowColorControls} from "./windowed"

export const windowDefaultDesign = designFromTemplate(
    "default",
    OVERLAY_COLOR_TEMPLATES.standard,
    WindowDesign,
    windowColorControls
)
