import {WidgetParamError, type WidgetAppearance, type WidgetSpec} from "./types"

export type SocialsWidgetParams = WidgetAppearance & {
    twitch: string
    twitter: string
    discord: string
    direction: "row" | "column"
    showLabels: boolean
    showIcons: boolean
}

const DIRECTIONS = ["row", "column"] as const

function handle(value: unknown): string {
    if (value === undefined) return ""
    if (typeof value !== "string" || value.length > 100) throw new WidgetParamError("Ungültiger Social-Handle.")
    return value.trim()
}

function booleanValue(value: unknown, fallback: boolean): boolean {
    if (value === undefined) return fallback
    if (typeof value !== "boolean") throw new WidgetParamError("Ungültige Social-Einstellung.")
    return value
}

export const socialsSpec: WidgetSpec<SocialsWidgetParams> = {
    width: 700,
    height: 54,
    defaults(appearance) {
        return {
            ...appearance,
            twitch: "",
            twitter: "",
            discord: "",
            direction: "row",
            showLabels: true,
            showIcons: true
        }
    },
    parse(raw, {appearance}) {
        if (raw.direction !== undefined && raw.direction !== "row" && raw.direction !== "column")
            throw new WidgetParamError("Ungültige Social-Einstellung.")
        return {
            ...appearance,
            twitch: handle(raw.twitch),
            twitter: handle(raw.twitter),
            discord: handle(raw.discord),
            direction: raw.direction === "column" ? "column" : "row",
            showLabels: booleanValue(raw.showLabels, true),
            showIcons: booleanValue(raw.showIcons, true)
        }
    },
    normalize(stored, appearance) {
        const raw = stored ?? {}
        return {
            ...appearance,
            twitch: typeof raw.twitch === "string" ? raw.twitch.slice(0, 100) : "",
            twitter: typeof raw.twitter === "string" ? raw.twitter.slice(0, 100) : "",
            discord: typeof raw.discord === "string" ? raw.discord.slice(0, 100) : "",
            direction: DIRECTIONS.includes(raw.direction as (typeof DIRECTIONS)[number])
                ? (raw.direction as (typeof DIRECTIONS)[number])
                : "row",
            showLabels: raw.showLabels !== false,
            showIcons: raw.showIcons !== false
        }
    }
}
