import {windowHeight} from "../window-geometry"
import {WidgetParamError, type WidgetAppearance, type WidgetSpec} from "./types"

export type WindowWidgetParams = WidgetAppearance & {
    title?: string
    lockContentAspectRatio?: boolean
    greenScreen?: boolean
}

function windowTitle(value: unknown): string {
    if (value === undefined) return "Fenster"
    if (typeof value !== "string" || value.length > 80)
        throw new WidgetParamError("Der Fenstertitel darf maximal 80 Zeichen enthalten.")
    return value.trim() || "Fenster"
}

function safeWindowTitle(value: unknown): string {
    return typeof value === "string" && value.length <= 80 ? value.trim() || "Fenster" : "Fenster"
}

export const windowSpec: WidgetSpec<WindowWidgetParams> = {
    width: 640,
    height: 300,
    defaults(appearance) {
        return {
            ...appearance,
            title: "Fenster",
            lockContentAspectRatio: false,
            greenScreen: false
        }
    },
    parse(raw, {appearance, width, height}) {
        if (raw.lockContentAspectRatio !== undefined && typeof raw.lockContentAspectRatio !== "boolean")
            throw new WidgetParamError("Ungültige 16:9-Einstellung.")
        if (raw.greenScreen !== undefined && typeof raw.greenScreen !== "boolean")
            throw new WidgetParamError("Ungültige Greenscreen-Einstellung.")
        if (raw.lockContentAspectRatio === true && Math.abs(height - windowHeight(width)) > 0.01)
            throw new WidgetParamError("Die gesperrte Content-Fläche muss 16:9 sein; der Header zählt nicht dazu.")
        return {
            ...appearance,
            title: windowTitle(raw.title),
            lockContentAspectRatio: raw.lockContentAspectRatio === true,
            greenScreen: raw.greenScreen === true
        }
    },
    normalize(stored, appearance) {
        const raw = stored ?? {}
        return {
            ...appearance,
            title: safeWindowTitle(raw.title),
            lockContentAspectRatio: raw.lockContentAspectRatio === true,
            greenScreen: raw.greenScreen === true
        }
    }
}
