import {OVERLAY_COLOR_TEMPLATES} from "@streamcat/interfaces"
import {designFromTemplate} from "../../shared/design"
import {WindowDesign, windowColorControls} from "./windowed"

export const windowWinterDesign = designFromTemplate(
    "winter",
    OVERLAY_COLOR_TEMPLATES.winter,
    WindowDesign,
    windowColorControls
)
