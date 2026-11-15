import type {WidgetModule} from "../types"
import {mediaAutumnDesign} from "./designs/autumn"
import {mediaDefaultDesign} from "./designs/default"
import {mediaWinterDesign} from "./designs/winter"
import {MediaSettings} from "./logic/media-settings"

function mediaModule(type: "IMAGE" | "VIDEO"): WidgetModule {
    return {
        type,
        label: type === "IMAGE" ? "Bild" : "Video",
        width: 480,
        height: 270,
        defaultDesign: "default",
        designs: {
            default: mediaDefaultDesign,
            autumn: mediaAutumnDesign,
            winter: mediaWinterDesign
        },
        settings: MediaSettings
    }
}

export const imageModule = mediaModule("IMAGE")
export const videoModule = mediaModule("VIDEO")
