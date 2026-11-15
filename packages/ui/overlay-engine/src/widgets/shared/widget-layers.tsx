import {isMediaWidget, type OverlayAsset, type OverlayLayout} from "@streamcat/interfaces"
import {widgetName} from "./widget-name"

export function moveWidgetToBackground(layout: OverlayLayout, widgetId: string): OverlayLayout {
    const background = layout.widgets.find((widget) => widget.id === widgetId)
    if (!background || !isMediaWidget(background)) return layout

    const otherWidgets = layout.widgets
        .filter((widget) => widget.id !== widgetId)
        .sort((left, right) => left.zIndex - right.zIndex)

    return {
        ...layout,
        widgets: [
            {
                ...background,
                x: 0,
                y: 0,
                width: layout.width,
                height: layout.height,
                zIndex: 0,
                params: {...background.params, fit: "cover"}
            },
            ...otherWidgets.map((widget, index) => ({...widget, zIndex: index + 1}))
        ]
    }
}

export function WidgetLayers({
    layout,
    assets,
    selectedId,
    onSelect,
    onChange,
    onRemove
}: {
    layout: OverlayLayout
    assets: OverlayAsset[]
    selectedId: string | null
    onSelect: (id: string) => void
    onChange: (layout: OverlayLayout) => void
    onRemove: (id: string) => void
}) {
    const ordered = [...layout.widgets].sort((a, b) => b.zIndex - a.zIndex)
    function move(index: number, direction: -1 | 1) {
        const widgets = [...ordered]
        const widget = widgets[index]
        widgets[index] = widgets[index + direction]
        widgets[index + direction] = widget
        onChange({
            ...layout,
            widgets: widgets.map((widget, position) => ({...widget, zIndex: widgets.length - position - 1}))
        })
    }
    return (
        <section className="overlay-layers">
            <h2>Ebenen</h2>
            <p className="muted overlay-hint">Oben steht im Vordergrund.</p>
            <div className="overlay-widget-list">
                {ordered.map((widget, index) => (
                    <div
                        className="overlay-layer-row"
                        key={widget.id}
                        onFocus={() => onSelect(widget.id)}
                        onKeyDown={(event) => {
                            if (event.defaultPrevented || (event.key !== "Delete" && event.key !== "Backspace")) return
                            event.preventDefault()
                            onRemove(widget.id)
                        }}
                    >
                        <button
                            className={`button ${selectedId === widget.id ? "selected" : ""}`}
                            onClick={() => onSelect(widget.id)}
                            title={widgetName(widget, assets)}
                        >
                            {widgetName(widget, assets)}
                        </button>
                        <button
                            className="button"
                            aria-label={`${widgetName(widget, assets)} nach vorne`}
                            disabled={index === 0}
                            onClick={() => move(index, -1)}
                        >
                            ↑
                        </button>
                        <button
                            className="button"
                            aria-label={`${widgetName(widget, assets)} nach hinten`}
                            disabled={index === ordered.length - 1}
                            onClick={() => move(index, 1)}
                        >
                            ↓
                        </button>
                    </div>
                ))}
            </div>
        </section>
    )
}
