import {OVERLAY_COLOR_TEMPLATES} from "@streamcat/interfaces"
import {designFromTemplate} from "../../../shared/design"
import {TwitchChatPlainDesign, twitchChatPlainControls} from "./plain"

export const twitchChatPlainDesign = designFromTemplate(
    "none",
    OVERLAY_COLOR_TEMPLATES.standard,
    TwitchChatPlainDesign,
    twitchChatPlainControls,
    {label: "Ohne Fenster"}
)
