import {widgetName} from "./shared/widget-name"
import {widgetModule} from "./registry"
import {useState} from "react"
import {SidebarSection, Select} from "../ui/dialog"
import {
    OVERLAY_COLOR_TEMPLATES,
    OVERLAY_WIDTH,
    OVERLAY_HEIGHT,
    MIN_WIDGET_WIDTH,
    MIN_WIDGET_HEIGHT,
    TWITCH_CHAT_DEFAULTS,
    TWITCH_CHAT_FONTS,
    withWidgetColors,
    windowWidth,
    windowHeight,
    type EditorWidget,
    type OverlayAsset,
    type OverlayLayout,
    type OverlayTheme
} from "@streamcat/interfaces"
import {lockedWindowSize} from "./window/logic/window-resize"
import {WindowObsSettings} from "./window/logic/window-obs-settings"
import {ColorField} from "./shared/color-field"

function withModuleDesign<T extends EditorWidget>(
    widget: T,
    design: {id: string; color: string; backgroundColor: string}
): T {
    return {
        ...widget,
        params: {
            ...widget.params,
            design: design.id,
            color: design.color,
            backgroundColor: design.backgroundColor,
            designColors: undefined
        }
    }
}

function withDesignColor<T extends EditorWidget>(widget: T, key: `--${string}`, value: string): T {
    return {
        ...widget,
        params: {...widget.params, designColors: {...widget.params.designColors, [key]: value}}
    }
}

function moduleSectionLabel(type: EditorWidget["type"]) {
    if (type === "SPOTIFY_NOW_PLAYING") return "Audio Einstellungen"
    if (type === "TWITCH_CHAT") return "Overlay Einstellungen"
    if (type === "WINDOW") return "Fenster"
    if (type === "IMAGE" || type === "VIDEO") return "Bild Einstellungen"
    return "Einstellungen"
}

function moduleSectionSummary(widget: EditorWidget, assets: OverlayAsset[]) {
    switch (widget.type) {
        case "TWITCH_CHAT": {
            const fontName =
                typeof widget.params.chatFont === "number"
                    ? (TWITCH_CHAT_FONTS[widget.params.chatFont] ?? "Schrift")
                    : (widget.params.chatFont ?? "Schrift")
            const fade = widget.params.chatFade ?? TWITCH_CHAT_DEFAULTS.chatFade
            return `${widget.params.chatChannel || "Kanal"} - ${fontName} - Fade ${fade}s`
        }
        case "SPOTIFY_NOW_PLAYING": {
            if (widget.params.spectralizer !== true) return "Spektrum aus"
            const mode = widget.params.spectrumMode === "simulated" ? "Simuliert" : "Audioeingang"
            const audio =
                widget.params.spectrumMode === "audio"
                    ? ` // Audio: ${widget.params.audioDeviceName || "Standard"}`
                    : ""
            return `Spektrum an // Modus: ${mode}${audio}`
        }
        case "WINDOW": {
            const title = widget.params.title || "Fenstertitel"
            const ratio = widget.params.lockContentAspectRatio === true ? "16:9" : "Frei"
            const green = widget.params.greenScreen === true ? "Greenscreen" : "Kein Greenscreen"
            return `${title} - ${ratio} - ${green}`
        }
        case "IMAGE":
        case "VIDEO": {
            const asset = widget.params.assetId ? assets.find((item) => item.id === widget.params.assetId) : null
            const name = asset?.fileName ?? (widget.type === "VIDEO" ? "Video" : "Bild")
            const fit = widget.params.fit === "cover" ? "Fläche ausfüllen" : "Ganzes Bild"
            return `${name} - ${fit}`
        }
        default:
            return null
    }
}

export function WidgetSettings({
    widget,
    assets = [],
    onChange,
    onRemove,
    onSetBackground,
    previewAudio = false,
    onPreviewAudioChange,
    onEditStart,
    onEditEnd,
    theme = "default",
    themeColors
}: {
    widget: EditorWidget
    assets?: OverlayAsset[]
    onChange: (widget: EditorWidget) => void
    onRemove: () => void
    previewAudio?: boolean
    onPreviewAudioChange?: (enabled: boolean) => void
    onSetBackground: () => void
    onEditStart?: () => void
    onEditEnd?: () => void
    theme?: OverlayTheme
    themeColors?: OverlayLayout["themeColors"]
}) {
    const themeTemplate = OVERLAY_COLOR_TEMPLATES[theme === "default" ? "standard" : theme]
    const themeColor = (key: `--${string}`): string | undefined => {
        if (key === "--window-bg") return themeColors?.window ?? themeTemplate.tokens?.["--window-bg"]
        if (key === "--progress-color") return themeColors?.primary ?? themeTemplate.tokens?.["--progress-color"]
        return undefined
    }
    const locked = widget.type === "WINDOW" && widget.params.lockContentAspectRatio === true
    const module = widgetModule(widget.type)
    const Settings = module.settings
    const design = module.designs[widget.params.design] ?? module.designs[module.defaultDesign]
    const [renaming, setRenaming] = useState(false)
    const [renameValue, setRenameValue] = useState("")
    const limits = {
        x: [0, OVERLAY_WIDTH - widget.width],
        y: [0, OVERLAY_HEIGHT - widget.height],
        width: [MIN_WIDGET_WIDTH, OVERLAY_WIDTH - widget.x],
        height: [MIN_WIDGET_HEIGHT, OVERLAY_HEIGHT - widget.y]
    }
    if (locked) {
        limits.width[1] = Math.min(limits.width[1], windowWidth(OVERLAY_HEIGHT - widget.y))
        limits.height = [
            windowHeight(MIN_WIDGET_WIDTH),
            Math.min(limits.height[1], windowHeight(OVERLAY_WIDTH - widget.x))
        ]
    }

    function selectDesign(id: string) {
        const design = module.designs[id]
        if (design) onChange(withModuleDesign(widget, design))
    }

    function commitRename() {
        setRenaming(false)
        const label = renameValue.trim()
        if (label && label !== widgetName(widget, assets)) onChange({...widget, label})
    }

    function updateGeometry(field: "x" | "y" | "width" | "height", value: string) {
        if (!value) return
        const parsedValue = Number(value)
        if (!Number.isFinite(parsedValue)) return
        if (locked && (field === "width" || field === "height")) {
            const size = lockedWindowSize(
                field === "width" ? parsedValue : widget.width,
                field === "height" ? parsedValue : widget.height,
                OVERLAY_WIDTH - widget.x,
                OVERLAY_HEIGHT - widget.y,
                field
            )
            onChange({...widget, ...size})
            return
        }
        onChange({...widget, [field]: Math.min(limits[field][1], Math.max(limits[field][0], parsedValue))})
    }

    const summary = moduleSectionSummary(widget, assets)

    return (
        <section className="overlay-settings">
            <div className={`overlay-settings-head${renaming ? " overlay-settings-head--renaming" : ""}`}>
                {renaming ? (
                    <>
                        <input
                            className="overlay-settings-rename"
                            value={renameValue}
                            autoFocus
                            maxLength={80}
                            aria-label="Widget umbenennen"
                            onChange={(event) => setRenameValue(event.target.value)}
                            onBlur={commitRename}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") event.currentTarget.blur()
                                if (event.key === "Escape") setRenaming(false)
                            }}
                        />
                        <p className="overlay-settings-hint">Eigener Name für dieses Widget.</p>
                        <div className="overlay-rename-actions">
                            <button
                                type="button"
                                className="button"
                                onClick={() => {
                                    setRenaming(false)
                                }}
                            >
                                Abbrechen
                            </button>
                            <button type="button" className="button primary" onClick={commitRename}>
                                Speichern
                            </button>
                        </div>
                    </>
                ) : (
                    <h3>{widgetName(widget, assets)}</h3>
                )}
                <div className="overlay-settings-actions">
                    <button
                        type="button"
                        className="overlay-icon-button"
                        aria-label="Widget umbenennen"
                        title="Umbenennen"
                        onClick={() => {
                            setRenameValue(widgetName(widget, assets))
                            setRenaming(true)
                        }}
                    >
                        <svg
                            aria-hidden="true"
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M2.59998 13.4L3.59998 10.2L10.7 3.09999C11.1 2.69999 11.8 2.69999 12.2 3.09999C12.6 3.49999 12.6 4.19999 12.2 4.59999L5.09998 11.7L2.59998 13.4Z"
                                fill="currentColor"
                            />
                        </svg>
                    </button>
                    <button
                        type="button"
                        className="overlay-icon-button"
                        aria-label="Widget entfernen"
                        title="Widget entfernen"
                        onClick={onRemove}
                    >
                        <svg
                            aria-hidden="true"
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path d="M3.5 4H12.5V5.4H3.5V4Z" fill="currentColor" />
                            <path d="M6.40002 2.39999H9.60002V3.59999H6.40002V2.39999Z" fill="currentColor" />
                            <path d="M4.70001 6H11.3L10.7 13.4H5.30001L4.70001 6Z" fill="currentColor" />
                        </svg>
                    </button>
                </div>
            </div>
            <div className="overlay-settings-block">
                <span className="overlay-settings-heading">Design</span>
                <Select
                    value={design.id}
                    options={Object.values(module.designs).map((item) => ({value: item.id, label: item.label}))}
                    onChange={(value) => selectDesign(value)}
                />
                <SidebarSection label="Farben" defaultOpen>
                    <div className="overlay-settings-section-content overlay-color-list">
                        {design.colorControls.map((control) => {
                            if (control.key === "color")
                                return (
                                    <ColorField
                                        key={control.key}
                                        label={control.label}
                                        value={widget.params.color}
                                        onChange={(color) => onChange(withWidgetColors(widget, {color}))}
                                        onEditStart={onEditStart}
                                        onEditEnd={onEditEnd}
                                    />
                                )
                            if (control.key === "backgroundColor")
                                return (
                                    <ColorField
                                        key={control.key}
                                        label={control.label}
                                        value={widget.params.backgroundColor}
                                        onChange={(backgroundColor) =>
                                            onChange(withWidgetColors(widget, {backgroundColor}))
                                        }
                                        onEditStart={onEditStart}
                                        onEditEnd={onEditEnd}
                                    />
                                )
                            const key = control.key
                            const value =
                                widget.params.designColors?.[key] ??
                                themeColor(key) ??
                                design.tokens?.[key] ??
                                "#ffffff"
                            return (
                                <ColorField
                                    key={key}
                                    label={control.label}
                                    value={value}
                                    onChange={(next) => onChange(withDesignColor(widget, key, next))}
                                    onEditStart={onEditStart}
                                    onEditEnd={onEditEnd}
                                />
                            )
                        })}
                    </div>
                </SidebarSection>
            </div>
            <div className="overlay-settings-block">
                <SidebarSection label={moduleSectionLabel(widget.type)} summary={summary}>
                    <div className="overlay-settings-section-content">
                        <Settings
                            widget={widget}
                            assets={assets}
                            onChange={onChange}
                            onSetBackground={onSetBackground}
                            previewAudio={previewAudio}
                            onPreviewAudioChange={onPreviewAudioChange}
                        />
                    </div>
                </SidebarSection>
            </div>
            <div className="overlay-settings-block">
                <SidebarSection
                    label="Position & Größe"
                    summary={`X ${widget.x} // Y ${widget.y} // ${widget.width} × ${widget.height}`}
                >
                    <div className="overlay-settings-section-content">
                        <div className="overlay-geometry">
                            {(["x", "y", "width", "height"] as const).map((field) => (
                                <label key={field} className="overlay-geometry-field">
                                    <span>{{x: "X", y: "Y", width: "Breite", height: "Höhe"}[field]}</span>
                                    <input
                                        type="number"
                                        step="any"
                                        value={widget[field]}
                                        min={limits[field][0]}
                                        max={limits[field][1]}
                                        onChange={(event) => updateGeometry(field, event.target.value)}
                                    />
                                </label>
                            ))}
                        </div>
                    </div>
                </SidebarSection>
            </div>
            {widget.type === "WINDOW" && (
                <div className="overlay-settings-block">
                    <WindowObsSettings widget={widget} />
                </div>
            )}
        </section>
    )
}
