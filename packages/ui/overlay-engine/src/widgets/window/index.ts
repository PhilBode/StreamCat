import type {WidgetModule} from "../types"
import {windowAutumnDesign} from "./designs/autumn"
import {windowDefaultDesign} from "./designs/default"
import {windowWinterDesign} from "./designs/winter"
import {WindowSettings} from "./logic/window-settings"

export const windowModule: WidgetModule = {
    type: "WINDOW",
    label: "Fenster",
    width: 640,
    height: 300,
    defaultDesign: "default",
    designs: {
        default: windowDefaultDesign,
        autumn: windowAutumnDesign,
        winter: windowWinterDesign
    },
    settings: WindowSettings
}
