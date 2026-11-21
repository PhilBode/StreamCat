import {isWidgetDesignId, type WidgetDesignId} from "../widget-designs"
import {WidgetParamError, type WidgetAppearance} from "./types"

const COLOR_PATTERN = /^(?:transparent|#[a-fA-F0-9]{3,4}|#[a-fA-F0-9]{6}|#[a-fA-F0-9]{8})$/
const DESIGN_COLOR_KEY_PATTERN = /^--[a-z0-9-]{1,60}$/

function isColor(value: unknown): value is string {
    return typeof value === "string" && COLOR_PATTERN.test(value)
}

function readDesign(raw: Record<string, unknown>, fallbackDesign: WidgetDesignId): WidgetDesignId {
    if (raw.design === undefined) return fallbackDesign
    if (isWidgetDesignId(raw.design)) return raw.design
    throw new WidgetParamError("Ungültiges Widget-Design.")
}

function readColor(raw: Record<string, unknown>, key: string): string {
    const value = raw[key]
    if (!isColor(value)) throw new WidgetParamError("Ungültige Widget-Farbe.")
    return value
}

function readDesignColors(raw: Record<string, unknown>): Record<`--${string}`, string> | undefined {
    const value = raw.designColors
    if (value === undefined) return undefined
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new WidgetParamError("Ungültige Design-Farben.")
    }
    const entries = Object.entries(value)
    if (entries.length > 20) throw new WidgetParamError("Zu viele Design-Farben.")
    const colors: Record<string, string> = {}
    for (const [key, entry] of entries) {
        if (!DESIGN_COLOR_KEY_PATTERN.test(key)) throw new WidgetParamError("Ungültiger Design-Farbname.")
        if (!isColor(entry)) throw new WidgetParamError("Ungültige Widget-Farbe.")
        colors[key] = entry
    }
    return Object.keys(colors).length ? (colors as Record<`--${string}`, string>) : undefined
}

function safeDesignColors(value: unknown): Record<`--${string}`, string> | undefined {
    if (!value || typeof value !== "object" || Array.isArray(value)) return undefined
    const entries = Object.entries(value)
    if (!entries.length || entries.length > 20) return undefined
    const colors: Record<string, string> = {}
    for (const [key, entry] of entries) {
        if (!DESIGN_COLOR_KEY_PATTERN.test(key) || !isColor(entry)) return undefined
        colors[key] = entry
    }
    return colors as Record<`--${string}`, string>
}

export function parseAppearance(raw: Record<string, unknown>, fallbackDesign: WidgetDesignId): WidgetAppearance {
    return {
        design: readDesign(raw, fallbackDesign),
        color: readColor(raw, "color"),
        backgroundColor: readColor(raw, "backgroundColor"),
        designColors: readDesignColors(raw)
    }
}

export function normalizeAppearance(
    raw: Record<string, unknown> | null,
    fallbackDesign: WidgetDesignId
): WidgetAppearance {
    const data = raw ?? {}
    const design =
        data.design === undefined ? fallbackDesign : isWidgetDesignId(data.design) ? data.design : fallbackDesign
    return {
        design,
        color: isColor(data.color) ? data.color : "#ffffff",
        backgroundColor: isColor(data.backgroundColor) ? data.backgroundColor : "#18181b",
        designColors: safeDesignColors(data.designColors)
    }
}
