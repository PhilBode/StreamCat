import {OVERLAY_COLOR_TEMPLATES} from "@streamcat/interfaces"
import {designFromTemplate} from "../../../shared/design"
import {TwitchChatWindowedDesign, twitchChatWindowedControls} from "./windowed"

export const twitchChatWindowedDesign = designFromTemplate(
    "windowed",
    OVERLAY_COLOR_TEMPLATES.standard,
    TwitchChatWindowedDesign,
    twitchChatWindowedControls,
    {label: "Mit Fenster"}
)
