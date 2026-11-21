import {WidgetParamError, type WidgetAppearance, type WidgetSpec} from "./types"

export type TextWidgetParams = WidgetAppearance & {
    text: string
    fontSize: number
    fontWeight: "normal" | "bold"
    align: "left" | "center" | "right"
    animation: "none" | "bounce" | "pulse" | "typewriter"
    animationSeconds: number
    letterSpacing: number
}

const ALIGNMENTS = ["left", "center", "right"] as const
const ANIMATIONS = ["none", "bounce", "pulse", "typewriter"] as const

function stringValue(value: unknown, fallback: string, max: number): string {
    if (value === undefined) return fallback
    if (typeof value !== "string" || value.length > max) throw new WidgetParamError("Ungültiger Text.")
    return value
}

function numberValue(value: unknown, fallback: number, min: number, max: number): number {
    if (value === undefined) return fallback
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max)
        throw new WidgetParamError("Ungültige Text-Einstellung.")
    return value
}

function choice<T extends readonly string[]>(value: unknown, options: T, fallback: T[number]): T[number] {
    if (value === undefined) return fallback
    if (typeof value === "string" && options.includes(value)) return value
    throw new WidgetParamError("Ungültige Text-Einstellung.")
}

function safeNumber(value: unknown, fallback: number, min: number, max: number): number {
    return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
}

export const textSpec: WidgetSpec<TextWidgetParams> = {
    width: 1100,
    height: 180,
    defaults(appearance) {
        return {
            ...appearance,
            text: "Text",
            fontSize: 134.4,
            fontWeight: "bold",
            align: "left",
            animation: "none",
            animationSeconds: 1.4,
            letterSpacing: 0
        }
    },
    parse(raw, {appearance}) {
        const weight = raw.fontWeight === "normal" ? "normal" : "bold"
        if (raw.fontWeight !== undefined && raw.fontWeight !== "normal" && raw.fontWeight !== "bold")
            throw new WidgetParamError("Ungültige Text-Einstellung.")
        return {
            ...appearance,
            text: stringValue(raw.text, "Text", 200),
            fontSize: numberValue(raw.fontSize, 134.4, 8, 400),
            fontWeight: weight,
            align: choice(raw.align, ALIGNMENTS, "left"),
            animation: choice(raw.animation, ANIMATIONS, "none"),
            animationSeconds: numberValue(raw.animationSeconds, 1.4, 0.2, 20),
            letterSpacing: numberValue(raw.letterSpacing, 0, -10, 50)
        }
    },
    normalize(stored, appearance) {
        const raw = stored ?? {}
        const align = ALIGNMENTS.includes(raw.align as (typeof ALIGNMENTS)[number])
            ? (raw.align as (typeof ALIGNMENTS)[number])
            : "left"
        const animation = ANIMATIONS.includes(raw.animation as (typeof ANIMATIONS)[number])
            ? (raw.animation as (typeof ANIMATIONS)[number])
            : "none"
        return {
            ...appearance,
            text: typeof raw.text === "string" ? raw.text.slice(0, 200) : "Text",
            fontSize: safeNumber(raw.fontSize, 134.4, 8, 400),
            fontWeight: raw.fontWeight === "normal" ? "normal" : "bold",
            align,
            animation,
            animationSeconds: safeNumber(raw.animationSeconds, 1.4, 0.2, 20),
            letterSpacing: safeNumber(raw.letterSpacing, 0, -10, 50)
        }
    }
}
