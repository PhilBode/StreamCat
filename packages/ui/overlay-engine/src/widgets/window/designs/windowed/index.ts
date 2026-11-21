import {OVERLAY_COLOR_TEMPLATES} from "@streamcat/interfaces"
import {designFromTemplate} from "../../../shared/design"
import {WindowDesign, windowColorControls} from "./windowed"

export const windowWindowedDesign = designFromTemplate(
    "windowed",
    OVERLAY_COLOR_TEMPLATES.standard,
    WindowDesign,
    windowColorControls,
    {label: "Fenster"}
)
