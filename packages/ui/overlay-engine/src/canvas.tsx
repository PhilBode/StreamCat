"use client"

import {useEffect, useRef, useState, type DragEvent, type PointerEvent} from "react"
import {
    MAX_OVERLAY_GUIDES,
    MIN_WIDGET_WIDTH,
    MIN_WIDGET_HEIGHT,
    WINDOW_CONTENT_RATIO,
    type OverlayAsset,
    type EditorWidget,
    type OverlayChat,
    type OverlayLayout,
    type OverlayPlayback
} from "@streamcat/interfaces"
import {OverlayRenderer} from "./renderer"
import {widgetName} from "./widgets/shared/widget-name"
import {ASSET_DRAG_TYPE} from "./assets/use-overlay-assets"
import {snapWidget} from "./alignment/snap"
import {AlignmentLines} from "./alignment/alignment-lines"
import {GuideRulers, type Guides, type GuideSelection} from "./alignment/guide-rulers"
import {WidgetDistances} from "./alignment/widget-distances"
import {resizeLockedWindow} from "./widgets/window/logic/window-resize"

type Corner = "nw" | "ne" | "sw" | "se"
export type OverlaySelection = {type: "widget"; id: string} | {type: "guide"; guide: GuideSelection} | null

type Gesture = {
    widget: EditorWidget
    corner?: Corner
    pointerId: number
    x: number
    y: number
    scale: number
    moved: boolean
}
const corners: Corner[] = ["nw", "ne", "sw", "se"]
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(value)))

export function OverlayCanvas({
    layout,
    playback,
    chat,
    selection,
    onSelect,
    onChange,
    onRemove,
    assets = [],
    onDropAsset,
    onDropFiles,
    audioEnabled = false,
    onGuidesChange,
    onEditStart,
    onEditEnd
}: {
    layout: OverlayLayout
    playback: OverlayPlayback
    chat: OverlayChat
    selection: OverlaySelection
    onSelect: (selection: OverlaySelection) => void
    onChange: (widget: EditorWidget) => void
    onRemove: (id: string) => void
    audioEnabled?: boolean
    assets?: OverlayAsset[]
    onGuidesChange: (guides: Guides) => void
    onEditStart?: () => void
    onEditEnd?: () => void
    onDropAsset?: (id: string, x: number, y: number) => void
    onDropFiles?: (files: File[], x: number, y: number) => void
}) {
    const container = useRef<HTMLDivElement>(null)
    const gesture = useRef<Gesture | null>(null)
    const [scale, setScale] = useState(0)
    const selectedId = selection?.type === "widget" ? selection.id : null
    const selectedGuide = selection?.type === "guide" ? selection.guide : null
    const [draggingId, setDraggingId] = useState<string | null>(null)
    const draggedWidget = layout.widgets.find((widget) => widget.id === draggingId)
    useEffect(() => {
        const element = container.current
        const section = element?.closest<HTMLElement>(".overlay-preview-section")
        if (!element || !section) return
        const observer = new ResizeObserver(() => {
            // Fit both axes: section padding (24/16/8) + rulers (24px left, 24px top, 1px borders).
            const box = section.getBoundingClientRect()
            const scale = Math.min(
                (box.width - 32 - 28) / layout.width,
                (box.height - 32 - 26) / layout.height
            )
            setScale(Math.max(0, scale))
        })
        observer.observe(section)
        return () => observer.disconnect()
    }, [layout.width, layout.height])

    function selectGuide(guide: GuideSelection | null) {
        onSelect(guide ? {type: "guide", guide} : null)
    }

    function start(event: PointerEvent<HTMLDivElement>, widget: EditorWidget, corner?: Corner) {
        if (event.button !== 0) return
        event.stopPropagation()
        event.preventDefault()
        event.currentTarget.closest<HTMLElement>(".overlay-hitbox")?.focus({preventScroll: true})
        onEditStart?.()
        onSelect({type: "widget", id: widget.id})
        const currentScale = (container.current?.getBoundingClientRect().width || layout.width) / layout.width
        gesture.current = {
            widget,
            corner,
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            scale: currentScale,
            moved: false
        }
        setDraggingId(widget.id)
        event.currentTarget.setPointerCapture(event.pointerId)
    }

    function move(event: PointerEvent<HTMLDivElement>) {
        const active = gesture.current
        if (!active || active.pointerId !== event.pointerId) return
        const widget = active.widget
        const dx = (event.clientX - active.x) / active.scale
        const dy = (event.clientY - active.y) / active.scale
        if (!active.moved && dx === 0 && dy === 0) return
        active.moved = true
        const tolerance = 6 / active.scale
        const corner = active.corner
        function apply(next: EditorWidget) {
            if (event.altKey) {
                onChange(next)
                return
            }
            const snapped = snapWidget(next, layout, tolerance, corner)
            onChange(snapped.widget)
        }
        if (!active.corner) {
            apply({
                ...widget,
                x: clamp(widget.x + dx, 0, layout.width - widget.width),
                y: clamp(widget.y + dy, 0, layout.height - widget.height)
            })
            return
        }
        apply(resizeFromDelta(widget, layout, active.corner, dx, dy))
    }

    function end(event: PointerEvent<HTMLDivElement>) {
        if (gesture.current?.pointerId === event.pointerId) {
            // The release can carry a newer position than the last pointermove, especially on quick drags.
            if (event.type === "pointerup") move(event)
            gesture.current = null
            setDraggingId(null)
            onEditEnd?.()
        }
        if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId)
    }

    function drop(event: DragEvent<HTMLDivElement>) {
        event.preventDefault()
        const rect = event.currentTarget.getBoundingClientRect()
        const x = clamp(((event.clientX - rect.left) * layout.width) / rect.width, 0, layout.width - MIN_WIDGET_WIDTH)
        const y = clamp(
            ((event.clientY - rect.top) * layout.height) / rect.height,
            0,
            layout.height - MIN_WIDGET_HEIGHT
        )
        if (event.dataTransfer.files.length) onDropFiles?.(Array.from(event.dataTransfer.files), x, y)
        else {
            const id = event.dataTransfer.getData(ASSET_DRAG_TYPE)
            if (id) onDropAsset?.(id, x, y)
        }
    }

    function addGuide(axis: keyof Guides) {
        const guides = layout.guides ?? {vertical: [], horizontal: []}
        if (guides[axis].length >= MAX_OVERLAY_GUIDES) return
        let value = (axis === "vertical" ? layout.width : layout.height) / 2
        while (guides[axis].includes(value)) value += 20
        onGuidesChange({...guides, [axis]: [...guides[axis], value]})
        selectGuide({axis, value})
    }

    function removeGuide() {
        const guides = layout.guides
        if (!selectedGuide || !guides?.[selectedGuide.axis].includes(selectedGuide.value)) return
        onGuidesChange({
            ...guides,
            [selectedGuide.axis]: guides[selectedGuide.axis].filter((value) => value !== selectedGuide.value)
        })
        selectGuide(null)
    }

    return (
        <div
            className="overlay-canvas-editor"
            onKeyDown={(event) => {
                if (
                    event.defaultPrevented ||
                    !["Delete", "Backspace"].includes(event.key) ||
                    !selectedGuide ||
                    gesture.current
                )
                    return
                const target = event.target as HTMLElement
                if (target.closest("input, textarea, [contenteditable]")) return
                event.preventDefault()
                removeGuide()
            }}
        >
            <GuideRulers
                layout={layout}
                canvas={container}
                scale={scale}
                selected={selectedGuide}
                onSelect={selectGuide}
                onChange={onGuidesChange}
                onAdd={addGuide}
                onEditStart={onEditStart}
                onEditEnd={onEditEnd}
            >
                <div
                    className="overlay-preview"
                    ref={container}
                    style={{width: layout.width * scale, height: layout.height * scale}}
                    aria-label="Overlay-Vorschau"
                    onDrop={drop}
                    onDragOver={(event) => {
                        if (
                            event.dataTransfer.types.includes("Files") ||
                            event.dataTransfer.types.includes(ASSET_DRAG_TYPE)
                        ) {
                            event.preventDefault()
                            event.dataTransfer.dropEffect = "copy"
                        }
                    }}
                >
                    <div
                        className="overlay-scaled-canvas"
                        style={{transform: `scale(${scale})`, visibility: scale ? "visible" : "hidden"}}
                    >
                        <OverlayRenderer
                            layout={layout}
                            playback={playback}
                            chat={chat}
                            assets={assets}
                            audioEnabled={audioEnabled}
                        />
                        <div
                            className="overlay-interactions"
                            onPointerDown={() => {
                                onSelect(null)
                            }}
                        >
                            {layout.widgets
                                .filter((widget) => !widget.hidden)
                                .map((widget) => (
                                    <div
                                        key={widget.id}
                                        className={`overlay-hitbox ${widget.id === selectedId ? "selected" : ""}`}
                                        role="button"
                                        tabIndex={0}
                                        aria-label={`${widgetName(widget, assets)}-Widget auswählen und verschieben`}
                                        style={{
                                            left: widget.x,
                                            top: widget.y,
                                            width: widget.width,
                                            height: widget.height,
                                            zIndex: widget.zIndex,
                                            borderRadius:
                                                widget.type === "IMAGE" || widget.type === "VIDEO" ? 0 : undefined
                                        }}
                                        onFocus={() => {
                                            onSelect({type: "widget", id: widget.id})
                                        }}
                                        onPointerDown={(event) => start(event, widget)}
                                        onPointerMove={move}
                                        onPointerUp={end}
                                        onPointerCancel={end}
                                        onLostPointerCapture={end}
                                        onKeyDown={(event) => {
                                            if (event.defaultPrevented) return
                                            if (event.key === "Delete" || event.key === "Backspace") {
                                                event.preventDefault()
                                                if (!gesture.current) onRemove(widget.id)
                                                return
                                            }
                                            if (event.key === "Enter" || event.key === " ") {
                                                event.preventDefault()
                                                onSelect({type: "widget", id: widget.id})
                                            }
                                            const delta = event.shiftKey ? 10 : 1
                                            if (
                                                ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
                                            ) {
                                                event.preventDefault()
                                                onChange({
                                                    ...widget,
                                                    x: clamp(
                                                        widget.x +
                                                            (event.key === "ArrowRight"
                                                                ? delta
                                                                : event.key === "ArrowLeft"
                                                                  ? -delta
                                                                  : 0),
                                                        0,
                                                        layout.width - widget.width
                                                    ),
                                                    y: clamp(
                                                        widget.y +
                                                            (event.key === "ArrowDown"
                                                                ? delta
                                                                : event.key === "ArrowUp"
                                                                  ? -delta
                                                                  : 0),
                                                        0,
                                                        layout.height - widget.height
                                                    )
                                                })
                                            }
                                        }}
                                    >
                                        {selectedId === widget.id &&
                                            corners.map((corner) => (
                                                <div
                                                    key={corner}
                                                    className={`overlay-resize ${corner}`}
                                                    onPointerDown={(event) => start(event, widget, corner)}
                                                />
                                            ))}
                                    </div>
                                ))}
                        </div>
                    </div>
                    <div className="overlay-alignment-feedback" style={{transform: `scale(${scale})`}}>
                        <AlignmentLines layout={layout} selected={draggedWidget} />
                        <WidgetDistances layout={layout} widget={draggedWidget} />
                    </div>
                </div>
            </GuideRulers>
        </div>
    )
}

function resizeFromDelta(
    widget: EditorWidget,
    layout: OverlayLayout,
    corner: Corner,
    dx: number,
    dy: number
): EditorWidget {
    const west = corner.endsWith("w")
    const north = corner.startsWith("n")
    const left = west ? clamp(widget.x + dx, 0, widget.x + widget.width - MIN_WIDGET_WIDTH) : widget.x
    const top = north ? clamp(widget.y + dy, 0, widget.y + widget.height - MIN_WIDGET_HEIGHT) : widget.y
    const right = west
        ? widget.x + widget.width
        : clamp(widget.x + widget.width + dx, widget.x + MIN_WIDGET_WIDTH, layout.width)
    const bottom = north
        ? widget.y + widget.height
        : clamp(widget.y + widget.height + dy, widget.y + MIN_WIDGET_HEIGHT, layout.height)
    const next = {...widget, x: left, y: top, width: right - left, height: bottom - top}
    if (widget.type === "WINDOW" && widget.params.lockContentAspectRatio) {
        const axis = Math.abs(dx) >= Math.abs(dy) * WINDOW_CONTENT_RATIO ? "width" : "height"
        return resizeLockedWindow(widget, layout, corner, next.width, next.height, axis)
    }
    return next
}
