import {OVERLAY_COLOR_TEMPLATES} from "@streamcat/interfaces"
import {designFromTemplate} from "../../shared/design"
import {WindowDesign, windowColorControls} from "./windowed"

export const windowAutumnDesign = designFromTemplate(
    "autumn",
    OVERLAY_COLOR_TEMPLATES.autumn,
    WindowDesign,
    windowColorControls
)
