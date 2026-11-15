import {widgetName} from "./shared/widget-name"
import {widgetModule} from "./registry"
import {
    OVERLAY_WIDTH,
    OVERLAY_HEIGHT,
    MIN_WIDGET_WIDTH,
    MIN_WIDGET_HEIGHT,
    withWidgetColors,
    windowWidth,
    windowHeight,
    type EditorWidget,
    type OverlayAsset
} from "@streamcat/interfaces"
import {lockedWindowSize} from "./window/logic/window-resize"
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

export function WidgetSettings({
    widget,
    assets = [],
    onChange,
    onRemove,
    onSetBackground,
    previewAudio = false,
    onPreviewAudioChange
}: {
    widget: EditorWidget
    assets?: OverlayAsset[]
    onChange: (widget: EditorWidget) => void
    onRemove: () => void
    previewAudio?: boolean
    onPreviewAudioChange?: (enabled: boolean) => void
    onSetBackground: () => void
}) {
    const locked = widget.type === "WINDOW" && widget.params.lockContentAspectRatio === true
    const module = widgetModule(widget.type)
    const Settings = module.settings
    const design = module.designs[widget.params.design] ?? module.designs[module.defaultDesign]
    const DesignSettings = design.settings
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

    return (
        <section className="overlay-settings">
            <h3>{widgetName(widget, assets)} bearbeiten</h3>
            <label className="overlay-theme-control">
                Design
                <select value={design.id} onChange={(event) => selectDesign(event.target.value)}>
                    {Object.values(module.designs).map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.label}
                        </option>
                    ))}
                </select>
            </label>
            <p className="muted overlay-hint">Das Design gilt nur für dieses Widget.</p>
            <div className="overlay-geometry">
                {(["x", "y", "width", "height"] as const).map((field) => (
                    <label key={field}>
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
            {design.colorControls.map((control) => {
                if (control.key === "color")
                    return (
                        <ColorField
                            key={control.key}
                            label={control.label}
                            value={widget.params.color}
                            onChange={(color) => onChange(withWidgetColors(widget, {color}))}
                        />
                    )
                if (control.key === "backgroundColor")
                    return (
                        <ColorField
                            key={control.key}
                            label={control.label}
                            value={widget.params.backgroundColor}
                            onChange={(backgroundColor) => onChange(withWidgetColors(widget, {backgroundColor}))}
                        />
                    )
                const key = control.key
                const value = widget.params.designColors?.[key] ?? design.tokens?.[key] ?? "#ffffff"
                return (
                    <ColorField
                        key={key}
                        label={control.label}
                        value={value}
                        onChange={(next) => onChange(withDesignColor(widget, key, next))}
                    />
                )
            })}
            {DesignSettings && (
                <DesignSettings
                    widget={widget}
                    assets={assets}
                    onChange={onChange}
                    onSetBackground={onSetBackground}
                    previewAudio={previewAudio}
                    onPreviewAudioChange={onPreviewAudioChange}
                />
            )}
            <Settings
                widget={widget}
                assets={assets}
                onChange={onChange}
                onSetBackground={onSetBackground}
                previewAudio={previewAudio}
                onPreviewAudioChange={onPreviewAudioChange}
            />
            <button className="button overlay-remove" onClick={onRemove}>
                Widget entfernen
            </button>
        </section>
    )
}
