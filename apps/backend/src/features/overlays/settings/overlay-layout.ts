import {BadRequestException} from "@nestjs/common"
import {
    WIDGET_SPECS,
    OVERLAY_THEME_COLORS,
    MAX_OVERLAY_GUIDES,
    MAX_OVERLAY_WIDGETS,
    MIN_WIDGET_HEIGHT,
    MIN_WIDGET_WIDTH,
    OVERLAY_HEIGHT,
    OVERLAY_WIDTH,
    WidgetParamError,
    isWidgetType,
    parseAppearance,
    type EditorWidget,
    type OverlayFont,
    type OverlayLayout,
    type OverlayScene,
    type OverlayTheme
} from "@streamcat/interfaces"

function object(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value))
        throw new BadRequestException("Ungültige Overlay-Einstellungen.")
    return value as Record<string, unknown>
}

const GEOMETRY_ROUNDING_TOLERANCE = 1e-9

function readGeometryValue(value: unknown, min: number, max: number): number {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new BadRequestException("Widget-Position und Größe müssen gültige Zahlen sein.")
    }
    if (value < min - GEOMETRY_ROUNDING_TOLERANCE || value > max + GEOMETRY_ROUNDING_TOLERANCE) {
        throw new BadRequestException("Widget-Position und Größe müssen innerhalb der Overlay-Fläche liegen.")
    }
    return Math.min(max, Math.max(min, value))
}

function color(value: unknown): string {
    if (
        typeof value !== "string" ||
        !/^(?:transparent|#[a-fA-F0-9]{3,4}|#[a-fA-F0-9]{6}|#[a-fA-F0-9]{8})$/.test(value)
    ) {
        throw new BadRequestException("Ungültige Widget-Farbe.")
    }
    return value
}

function themeColors(value: unknown): OverlayLayout["themeColors"] {
    if (value === undefined) return undefined
    const data = object(value)
    const keys = ["primary", "secondary", "surface", "window", "text"] as const
    const colors: NonNullable<OverlayLayout["themeColors"]> = {}
    for (const key of keys) {
        if (data[key] === undefined) continue
        colors[key] = color(data[key])
    }
    return Object.keys(colors).length ? colors : undefined
}

export function overlayGuides(input: unknown): NonNullable<OverlayLayout["guides"]> {
    const data = input === undefined ? {} : object(input)
    const guides: NonNullable<OverlayLayout["guides"]> = {vertical: [], horizontal: []}
    for (const [axis, max] of [
        ["vertical", OVERLAY_WIDTH],
        ["horizontal", OVERLAY_HEIGHT]
    ] as const) {
        const values = data[axis] ?? []
        if (
            !Array.isArray(values) ||
            values.length > MAX_OVERLAY_GUIDES ||
            values.some((value) => typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > max)
        ) {
            throw new BadRequestException(
                `Maximal ${MAX_OVERLAY_GUIDES} Hilfslinien je Richtung mit ganzzahligen Koordinaten innerhalb der Szene sind erlaubt.`
            )
        }
        guides[axis] = [...new Set<number>(values)].sort((a, b) => a - b)
    }
    return guides
}

export function validateOverlayLayout(input: unknown): OverlayLayout {
    const data = object(input)
    if (
        data.width !== OVERLAY_WIDTH ||
        data.height !== OVERLAY_HEIGHT ||
        !Object.hasOwn(OVERLAY_THEME_COLORS, data.theme as string)
    ) {
        throw new BadRequestException("Das Overlay benötigt eine Fläche von 1920 × 1080 und ein gültiges Theme.")
    }
    const theme = data.theme as OverlayTheme
    const scene = data.scene ?? "widgets"
    if (!["intermission", "starting_soon", "stream_ending", "widgets"].includes(scene as string))
        throw new BadRequestException("Unbekannte Overlay-Szene.")
    const font = data.font ?? "tiny5"
    if (font !== "tiny5" && font !== "jersey10") throw new BadRequestException("Unbekannte Overlay-Schrift.")
    if (!Array.isArray(data.widgets) || data.widgets.length > MAX_OVERLAY_WIDGETS)
        throw new BadRequestException(`Maximal ${MAX_OVERLAY_WIDGETS} Widgets sind erlaubt.`)
    const ids = new Set<string>()
    const widgets: EditorWidget[] = data.widgets.map((value) => {
        const widget = object(value)
        if (typeof widget.id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(widget.id) || ids.has(widget.id))
            throw new BadRequestException("Jedes Widget benötigt eine eindeutige ID.")
        ids.add(widget.id)
        if (!isWidgetType(widget.type)) throw new BadRequestException("Unbekannter Widget-Typ.")
        const x = readGeometryValue(widget.x, 0, OVERLAY_WIDTH - MIN_WIDGET_WIDTH)
        const y = readGeometryValue(widget.y, 0, OVERLAY_HEIGHT - MIN_WIDGET_HEIGHT)
        const width = readGeometryValue(widget.width, MIN_WIDGET_WIDTH, OVERLAY_WIDTH - x)
        const height = readGeometryValue(widget.height, MIN_WIDGET_HEIGHT, OVERLAY_HEIGHT - y)
        const zIndex = widget.zIndex
        if (typeof zIndex !== "number" || !Number.isInteger(zIndex) || zIndex < 0 || zIndex > 1000)
            throw new BadRequestException("Die Widget-Reihenfolge muss eine ganze Zahl zwischen 0 und 1000 sein.")
        const params = object(widget.params)
        const label =
            typeof widget.label === "string" && widget.label.trim() ? widget.label.trim().slice(0, 80) : undefined
        const hidden = widget.hidden === true ? true : undefined
        const geometry = {id: widget.id, x, y, width, height, zIndex, label, hidden}
        try {
            const appearance = parseAppearance(params, "default")
            const parsed = WIDGET_SPECS[widget.type].parse(params, {appearance, width, height})
            return {...geometry, type: widget.type, params: parsed} as EditorWidget
        } catch (error) {
            if (error instanceof WidgetParamError) throw new BadRequestException(error.message)
            throw error
        }
    })
    return {
        width: OVERLAY_WIDTH,
        height: OVERLAY_HEIGHT,
        theme,
        themeColors: themeColors(data.themeColors),
        scene: scene as OverlayScene,
        font: font as OverlayFont,
        guides: overlayGuides(data.guides),
        widgets
    }
}
