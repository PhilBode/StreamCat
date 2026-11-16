"use client"

import {useState} from "react"
import {isMediaWidget, type EditorWidget, type OverlayAsset, type OverlayLayout} from "@streamcat/interfaces"
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

function glyphFor(type: EditorWidget["type"]) {
    if (type === "SPOTIFY_NOW_PLAYING")
        return (
            <svg
                aria-hidden="true"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                    d="M11.5 2.5V10.25C11.5 11.4926 10.4926 12.5 9.25 12.5C8.00736 12.5 7 11.4926 7 10.25C7 9.00736 8.00736 8 9.25 8C9.7757 8 10.262 8.18042 10.6514 8.48611V4.10938L6 5.25V11.75C6 12.9926 4.99264 14 3.75 14C2.50736 14 1.5 12.9926 1.5 11.75C1.5 10.5074 2.50736 9.5 3.75 9.5C4.2757 9.5 4.76203 9.68042 5.15137 9.98611V4.5L11.5 2.5Z"
                    fill="currentColor"
                />
            </svg>
        )
    if (type === "TWITCH_CHAT")
        return (
            <svg
                aria-hidden="true"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                    d="M2.25 2.25H13.75V3.25H2.25V2.25ZM2.25 5.25H13.75V6.25H2.25V5.25ZM2.25 8.25H13.75V9.25H2.25V8.25ZM2.25 11.25H13.75V12.25H2.25V11.25Z"
                    fill="currentColor"
                />
                <rect x="1.75" y="1.75" width="12.5" height="12.5" stroke="currentColor" strokeWidth="1" fill="none" />
            </svg>
        )
    if (type === "WINDOW")
        return (
            <svg
                aria-hidden="true"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <rect x="2" y="2" width="12" height="12" stroke="currentColor" strokeWidth="1.2" fill="none" />
                <rect x="4.5" y="4.5" width="7" height="4" fill="currentColor" />
            </svg>
        )
    if (type === "VIDEO")
        return (
            <svg
                aria-hidden="true"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path d="M3 3.5L13 8L3 12.5V3.5Z" fill="currentColor" />
            </svg>
        )
    return (
        <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <rect x="2" y="2" width="12" height="12" stroke="currentColor" strokeWidth="1.2" fill="none" />
            <circle cx="6" cy="6" r="1.5" fill="currentColor" />
            <path d="M3.5 12L7 8.5L9 10.5L11 8L12.5 9.5V13H3.5V12Z" fill="currentColor" />
        </svg>
    )
}

function DragHandleGlyph() {
    return (
        <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            {[
                [5, 3],
                [9, 3],
                [5, 7],
                [9, 7],
                [5, 11],
                [9, 11]
            ].map(([x, y], index) => (
                <rect key={index} x={x} y={y} width="2" height="2" fill="currentColor" />
            ))}
        </svg>
    )
}

function EyeIcon({hidden}: {hidden: boolean}) {
    return (
        <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M1.5 8C2.8 5.2 5.2 3.5 8 3.5C10.8 3.5 13.2 5.2 14.5 8C13.2 10.8 10.8 12.5 8 12.5C5.2 12.5 2.8 10.8 1.5 8Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="square"
            />
            <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
            {!hidden ? null : (
                <path
                    className="overlay-layer-eye-slash"
                    d="M1.5 1.5L14.5 14.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                />
            )}
        </svg>
    )
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
    const [dragIndex, setDragIndex] = useState<number | null>(null)
    const [renamingId, setRenamingId] = useState<string | null>(null)
    const [renameValue, setRenameValue] = useState("")
    const ordered = [...layout.widgets].sort((a, b) => b.zIndex - a.zIndex)

    function reorder(from: number, to: number) {
        if (from === to) return
        const widgets = [...ordered]
        const [moved] = widgets.splice(from, 1)
        widgets.splice(to, 0, moved)
        onChange({
            ...layout,
            widgets: widgets.map((widget, position) => ({...widget, zIndex: widgets.length - position - 1}))
        })
    }

    function toggleHidden(widget: EditorWidget) {
        onChange({
            ...layout,
            widgets: layout.widgets.map((item) => (item.id === widget.id ? {...item, hidden: !item.hidden} : item))
        })
    }

    function commitRename(widget: EditorWidget) {
        const label = renameValue.trim()
        setRenamingId(null)
        if (label === widgetName(widget, assets)) return
        onChange({
            ...layout,
            widgets: layout.widgets.map((item) => (item.id === widget.id ? {...item, label: label || undefined} : item))
        })
    }

    return (
        <section className="overlay-layers">
            <div className="overlay-widget-list">
                {ordered.map((widget, index) => {
                    const hidden = widget.hidden === true
                    const renaming = renamingId === widget.id
                    return (
                        <div
                            className={`overlay-layer-row ${selectedId === widget.id ? "overlay-layer-row--selected" : ""} ${
                                hidden ? "overlay-layer-row--hidden" : ""
                            } ${dragIndex === index ? "overlay-layer-row--dragging" : ""}`}
                            key={widget.id}
                            draggable={!renaming}
                            onDragStart={(event) => {
                                setDragIndex(index)
                                event.dataTransfer.effectAllowed = "move"
                            }}
                            onDragOver={(event) => {
                                if (dragIndex === null) return
                                event.preventDefault()
                                event.dataTransfer.dropEffect = "move"
                            }}
                            onDrop={(event) => {
                                event.preventDefault()
                                if (dragIndex !== null) reorder(dragIndex, index)
                                setDragIndex(null)
                            }}
                            onDragEnd={() => setDragIndex(null)}
                            onFocus={() => onSelect(widget.id)}
                            onKeyDown={(event) => {
                                if (event.defaultPrevented || (event.key !== "Delete" && event.key !== "Backspace"))
                                    return
                                if (renaming) return
                                event.preventDefault()
                                onRemove(widget.id)
                            }}
                        >
                            <span className="overlay-layer-handle" aria-hidden="true">
                                <DragHandleGlyph />
                            </span>
                            <span className="overlay-layer-glyph" aria-hidden="true">
                                {glyphFor(widget.type)}
                            </span>
                            {renaming ? (
                                <input
                                    className="overlay-layer-rename"
                                    value={renameValue}
                                    autoFocus
                                    maxLength={80}
                                    aria-label="Ebene umbenennen"
                                    onChange={(event) => setRenameValue(event.target.value)}
                                    onBlur={() => commitRename(widget)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") commitRename(widget)
                                        if (event.key === "Escape") setRenamingId(null)
                                    }}
                                />
                            ) : (
                                <button
                                    type="button"
                                    className="overlay-layer-name"
                                    onClick={() => onSelect(widget.id)}
                                    onDoubleClick={() => {
                                        setRenameValue(widgetName(widget, assets))
                                        setRenamingId(widget.id)
                                    }}
                                    title={widgetName(widget, assets)}
                                >
                                    <span className="overlay-layer-label">{widgetName(widget, assets)}</span>
                                </button>
                            )}
                            <button
                                type="button"
                                className="overlay-layer-eye"
                                aria-label={`${widgetName(widget, assets)} ${hidden ? "einblenden" : "ausblenden"}`}
                                aria-pressed={hidden}
                                onClick={() => {
                                    onSelect(widget.id)
                                    toggleHidden(widget)
                                }}
                            >
                                <EyeIcon hidden={hidden} />
                            </button>
                        </div>
                    )
                })}
            </div>
        </section>
    )
}
