import {BadRequestException} from "@nestjs/common"
import {
    OVERLAY_THEME_COLORS,
    WIDGET_DESIGNS,
    TWITCH_CHAT_DEFAULTS,
    TWITCH_CHAT_FONTS,
    MAX_OVERLAY_WIDGETS,
    MAX_OVERLAY_GUIDES,
    OVERLAY_WIDTH,
    OVERLAY_HEIGHT,
    MIN_WIDGET_WIDTH,
    MIN_WIDGET_HEIGHT,
    windowHeight,
    type EditorWidget,
    type ChatWidgetParams,
    type OverlayLayout,
    type OverlayTheme,
    type OverlayScene,
    type OverlayFont,
    type WidgetDesignId
} from "@streamcat/interfaces"

function object(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value))
        throw new BadRequestException("Ungültige Overlay-Einstellungen.")
    return value as Record<string, unknown>
}

// Fractional 16:9 sizes can exceed a scene edge by a rounding error.
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

function widgetDesign(value: unknown, fallback: OverlayTheme): WidgetDesignId {
    if (value === undefined) return fallback
    if (typeof value === "string" && Object.hasOwn(WIDGET_DESIGNS, value)) return value as WidgetDesignId
    throw new BadRequestException("Unbekanntes Widget-Design.")
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

function chatFont(value: unknown): number | string {
    if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value < TWITCH_CHAT_FONTS.length)
        return value
    if (typeof value === "string") {
        const name = value.trim()
        if (!name) return TWITCH_CHAT_DEFAULTS.chatFont
        if (name.length <= 100 && /^[a-z0-9][a-z0-9 -]*$/i.test(name) && /[a-z]/i.test(name)) return name
    }
    throw new BadRequestException("Ungültige Chat-Schrift. Gib einen Schriftnamen ein, z. B. Tiny5.")
}

function chatSettings(params: Record<string, unknown>): Partial<ChatWidgetParams> {
    const channel = params.chatChannel ?? ""
    if (typeof channel !== "string" || (channel.trim() && !/^[a-zA-Z0-9_]{1,25}$/.test(channel.trim())))
        throw new BadRequestException("Ungültiger Twitch-Kanal.")
    const settings = {
        ...TWITCH_CHAT_DEFAULTS,
        chatChannel: channel.trim(),
        chatFont: chatFont(params.chatFont ?? TWITCH_CHAT_DEFAULTS.chatFont)
    }
    for (const [key, max] of [
        ["chatSize", 3],
        ["chatFade", 3600]
    ] as const) {
        if (params[key] === undefined) continue
        const value = params[key]
        if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > max)
            throw new BadRequestException("Ungültige Chat-Einstellung.")
        settings[key] = value
    }
    for (const key of ["chatAnimate", "chatBots", "chatHideCommands", "chatHideBadges"] as const) {
        if (params[key] === undefined) continue
        if (typeof params[key] !== "boolean") throw new BadRequestException("Ungültige Chat-Einstellung.")
        settings[key] = params[key]
    }
    return settings
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
    const socialInput = data.socials === undefined ? {} : object(data.socials)
    const socials: NonNullable<OverlayLayout["socials"]> = {}
    for (const key of ["twitch", "twitter", "discord"] as const) {
        if (socialInput[key] === undefined) continue
        if (typeof socialInput[key] !== "string" || socialInput[key].length > 100)
            throw new BadRequestException("Social-Handles dürfen maximal 100 Zeichen enthalten.")
        socials[key] = socialInput[key].trim()
    }
    if (!Array.isArray(data.widgets) || data.widgets.length > MAX_OVERLAY_WIDGETS)
        throw new BadRequestException(`Maximal ${MAX_OVERLAY_WIDGETS} Widgets sind erlaubt.`)
    const ids = new Set<string>()
    const widgets: EditorWidget[] = data.widgets.map((value) => {
        const widget = object(value)
        if (typeof widget.id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(widget.id) || ids.has(widget.id))
            throw new BadRequestException("Jedes Widget benötigt eine eindeutige ID.")
        ids.add(widget.id)
        if (!["SPOTIFY_NOW_PLAYING", "TWITCH_CHAT", "IMAGE", "VIDEO", "WINDOW"].includes(widget.type as string))
            throw new BadRequestException("Unbekannter Widget-Typ.")
        const x = readGeometryValue(widget.x, 0, OVERLAY_WIDTH - MIN_WIDGET_WIDTH)
        const y = readGeometryValue(widget.y, 0, OVERLAY_HEIGHT - MIN_WIDGET_HEIGHT)
        const width = readGeometryValue(widget.width, MIN_WIDGET_WIDTH, OVERLAY_WIDTH - x)
        const height = readGeometryValue(widget.height, MIN_WIDGET_HEIGHT, OVERLAY_HEIGHT - y)
        const zIndex = widget.zIndex
        if (typeof zIndex !== "number" || !Number.isInteger(zIndex) || zIndex < 0 || zIndex > 1000)
            throw new BadRequestException("Die Widget-Reihenfolge muss eine ganze Zahl zwischen 0 und 1000 sein.")
        const params = object(widget.params)
        if (params.spectralizer !== undefined && typeof params.spectralizer !== "boolean")
            throw new BadRequestException("Ungültige Spektrum-Einstellung.")
        if (
            params.audioDeviceName !== undefined &&
            (typeof params.audioDeviceName !== "string" || params.audioDeviceName.length > 200)
        )
            throw new BadRequestException("Ungültiger Audioeingang.")
        const geometry = {id: widget.id, x, y, width, height, zIndex}
        const appearance = {
            design: widgetDesign(params.design, theme),
            color: color(params.color),
            backgroundColor: color(params.backgroundColor)
        }
        switch (widget.type) {
            case "WINDOW":
                if (params.title !== undefined && (typeof params.title !== "string" || params.title.length > 80))
                    throw new BadRequestException("Der Fenstertitel darf maximal 80 Zeichen enthalten.")
                if (params.lockContentAspectRatio !== undefined && typeof params.lockContentAspectRatio !== "boolean")
                    throw new BadRequestException("Ungültige 16:9-Einstellung.")
                if (params.greenScreen !== undefined && typeof params.greenScreen !== "boolean")
                    throw new BadRequestException("Ungültige Greenscreen-Einstellung.")
                if (params.lockContentAspectRatio === true && Math.abs(height - windowHeight(width)) > 0.01)
                    throw new BadRequestException(
                        "Die gesperrte Content-Fläche muss 16:9 sein; der Header zählt nicht dazu."
                    )
                return {
                    ...geometry,
                    type: "WINDOW",
                    params: {
                        ...appearance,
                        title: (params.title ?? "Fenster") as string,
                        lockContentAspectRatio: params.lockContentAspectRatio === true,
                        greenScreen: params.greenScreen === true
                    }
                }
            case "SPOTIFY_NOW_PLAYING":
                if (
                    params.spectrumMode !== undefined &&
                    params.spectrumMode !== "audio" &&
                    params.spectrumMode !== "simulated"
                )
                    throw new BadRequestException("Unbekannter Spektrum-Modus.")
                return {
                    ...geometry,
                    type: "SPOTIFY_NOW_PLAYING",
                    params: {
                        ...appearance,
                        spectralizer: params.spectralizer === true,
                        spectrumMode: (params.spectrumMode ?? "audio") as "audio" | "simulated",
                        audioDeviceName: (params.audioDeviceName as string | undefined) ?? ""
                    }
                }
            case "TWITCH_CHAT":
                return {...geometry, type: "TWITCH_CHAT", params: {...appearance, ...chatSettings(params)}}
            case "IMAGE":
            case "VIDEO":
                if (typeof params.assetId !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(params.assetId))
                    throw new BadRequestException("Wähle ein hochgeladenes Medium für dieses Widget.")
                if (params.fit !== undefined && params.fit !== "contain" && params.fit !== "cover")
                    throw new BadRequestException("Ungültige Medien-Skalierung.")
                return {
                    ...geometry,
                    type: widget.type,
                    params: {
                        ...appearance,
                        assetId: params.assetId as string,
                        fit: (params.fit ?? "contain") as "contain" | "cover"
                    }
                }
            default:
                throw new BadRequestException("Unbekannter Widget-Typ.")
        }
    })
    return {
        width: OVERLAY_WIDTH,
        height: OVERLAY_HEIGHT,
        theme,
        scene: scene as OverlayScene,
        font: font as OverlayFont,
        socials,
        guides: overlayGuides(data.guides),
        widgets
    }
}
