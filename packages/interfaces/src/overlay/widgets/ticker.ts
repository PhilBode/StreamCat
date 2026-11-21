import {WidgetParamError, type WidgetAppearance, type WidgetSpec} from "./types"

export type TickerWidgetParams = WidgetAppearance & {
    text: string
    separator: string
    speedSeconds: number
    direction: "left" | "right"
}

function textValue(value: unknown, fallback: string, max: number): string {
    if (value === undefined) return fallback
    if (typeof value !== "string" || value.length > max) throw new WidgetParamError("Ungültige Ticker-Einstellung.")
    return value
}

function numberValue(value: unknown, fallback: number, min: number, max: number): number {
    if (value === undefined) return fallback
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max)
        throw new WidgetParamError("Ungültige Ticker-Geschwindigkeit.")
    return value
}

function safeNumber(value: unknown, fallback: number, min: number, max: number): number {
    return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
}

export const tickerSpec: WidgetSpec<TickerWidgetParams> = {
    width: 1200,
    height: 60,
    defaults(appearance) {
        return {
            ...appearance,
            text: "",
            separator: " • ",
            speedSeconds: 20,
            direction: "left"
        }
    },
    parse(raw, {appearance}) {
        if (raw.direction !== undefined && raw.direction !== "left" && raw.direction !== "right")
            throw new WidgetParamError("Ungültige Ticker-Richtung.")
        return {
            ...appearance,
            text: textValue(raw.text, "", 500),
            separator: textValue(raw.separator, " • ", 20),
            speedSeconds: numberValue(raw.speedSeconds, 20, 2, 120),
            direction: raw.direction === "right" ? "right" : "left"
        }
    },
    normalize(stored, appearance) {
        const raw = stored ?? {}
        return {
            ...appearance,
            text: typeof raw.text === "string" ? raw.text.slice(0, 500) : "",
            separator: typeof raw.separator === "string" ? raw.separator.slice(0, 20) : " • ",
            speedSeconds: safeNumber(raw.speedSeconds, 20, 2, 120),
            direction: raw.direction === "right" ? "right" : "left"
        }
    }
}
