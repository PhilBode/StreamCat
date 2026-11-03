"use client"

import {useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode, type RefObject} from "react"
import {MAX_OVERLAY_GUIDES, type OverlayLayout} from "@streamcat/interfaces"

export type Guides = NonNullable<OverlayLayout["guides"]>
export type GuideSelection = {axis: keyof Guides; value: number}
type GuideDrag = {
    axis: keyof Guides
    original?: number
    pointerId: number
    value: number
    inside: boolean
    offset: number
}
const EMPTY_GUIDES: Guides = {vertical: [], horizontal: []}
const axes = ["vertical", "horizontal"] as const

export function GuideRulers({
    layout,
    canvas,
    scale,
    selected,
    onSelect,
    onChange,
    onAdd,
    onEditStart,
    onEditEnd,
    children
}: {
    layout: OverlayLayout
    canvas: RefObject<HTMLDivElement | null>
    scale: number
    selected: GuideSelection | null
    onSelect: (guide: GuideSelection | null) => void
    onChange: (guides: Guides) => void
    onAdd: (axis: keyof Guides) => void
    children: ReactNode
    onEditStart?: () => void
    onEditEnd?: () => void
}) {
    const guides = layout.guides ?? EMPTY_GUIDES
    const active = useRef<GuideDrag | null>(null)
    const [preview, setPreview] = useState<GuideDrag | null>(null)

    function guidePosition(event: PointerEvent<HTMLButtonElement>, axis: keyof Guides, offset = 0) {
        const rect = canvas.current?.getBoundingClientRect()
        if (!rect) return null
        const vertical = axis === "vertical"
        const sceneLength = vertical ? layout.width : layout.height
        const pointerOffset = vertical ? event.clientX - rect.left : event.clientY - rect.top
        const canvasLength = vertical ? rect.width : rect.height
        const coordinate = (pointerOffset / canvasLength) * sceneLength
        const value = Math.max(0, Math.min(sceneLength, Math.round(coordinate) - offset))
        const inside =
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom
        return {value, inside}
    }

    function startGuideDrag(event: PointerEvent<HTMLButtonElement>, axis: keyof Guides, original?: number) {
        if (event.button !== 0 || (original === undefined && guides[axis].length >= MAX_OVERLAY_GUIDES)) return
        const next = guidePosition(event, axis)
        if (!next) return
        event.preventDefault()
        event.stopPropagation()
        if (original !== undefined) {
            event.currentTarget.focus({preventScroll: true})
            onSelect({axis, value: original})
        }
        onEditStart?.()
        active.current = {
            axis,
            original,
            pointerId: event.pointerId,
            ...next,
            value: original ?? next.value,
            offset: original === undefined ? 0 : next.value - original
        }
        setPreview(active.current)
        event.currentTarget.setPointerCapture(event.pointerId)
    }

    function moveGuide(event: PointerEvent<HTMLButtonElement>) {
        const drag = active.current
        if (!drag || drag.pointerId !== event.pointerId) return
        const next = guidePosition(event, drag.axis, drag.offset)
        if (!next) return
        // Existing guides keep their last valid position when the pointer leaves the scene.
        active.current = {...drag, ...next, value: next.inside || drag.original === undefined ? next.value : drag.value}
        setPreview(active.current)
    }

    function finishGuideDrag(event: PointerEvent<HTMLButtonElement>) {
        const drag = active.current
        if (!drag || drag.pointerId !== event.pointerId) return
        active.current = null
        setPreview(null)
        const next = event.type === "pointerup" ? guidePosition(event, drag.axis, drag.offset) : null
        // Capture loss must not discard a visible move. A new guide still requires a drop inside the scene.
        let value = drag.original !== undefined ? drag.value : undefined
        if (next?.inside) value = next.value
        if (value !== undefined) {
            const values =
                drag.original === undefined
                    ? [...guides[drag.axis], value]
                    : guides[drag.axis].map((current) => (current === drag.original ? value : current))
            onChange({...guides, [drag.axis]: [...new Set(values)]})
            onSelect({axis: drag.axis, value})
        }
        onEditEnd?.()
        if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId)
    }

    function moveGuideWithKeyboard(
        event: KeyboardEvent<HTMLButtonElement>,
        guide: GuideSelection & {original: number}
    ) {
        const {axis, value, original} = guide
        const decrease = axis === "vertical" ? "ArrowLeft" : "ArrowUp"
        const increase = axis === "vertical" ? "ArrowRight" : "ArrowDown"
        if (event.key !== decrease && event.key !== increase) return
        event.preventDefault()
        const distance = event.shiftKey ? 10 : 1
        const direction = event.key === increase ? 1 : -1
        const sceneLength = axis === "vertical" ? layout.width : layout.height
        const next = Math.max(0, Math.min(sceneLength, value + direction * distance))
        if (guides[axis].some((item) => item === next && item !== original)) return
        onChange({...guides, [axis]: guides[axis].map((item) => (item === original ? next : item))})
        onSelect({axis, value: next})
    }

    function visibleGuides(axis: keyof Guides) {
        const values = guides[axis].map((value) => ({value, original: value}))
        if (preview?.axis !== axis || (!preview.inside && preview.original === undefined)) return values
        const index = values.findIndex((item) => item.original === preview.original)
        if (index >= 0) values[index] = {value: preview.value, original: preview.original ?? preview.value}
        else if (!values.some((item) => item.value === preview.value))
            values.push({value: preview.value, original: preview.value})
        return values
    }

    function renderGuideHandles(axis: keyof Guides) {
        const vertical = axis === "vertical"
        const sceneLength = vertical ? layout.width : layout.height
        const axisLabel = vertical ? "X" : "Y"
        const labelSpace = vertical ? 120 : 40
        return visibleGuides(axis).map(({value, original}, index) => {
            const position = `${(value / sceneLength) * 100}%`
            const style = vertical ? {left: position} : {top: position}
            const edgeClass = sceneLength - value < labelSpace ? "edge-end" : ""
            const selectedClass = selected?.axis === axis && selected.value === original ? "selected" : ""
            return (
                <button
                    type="button"
                    key={index}
                    className={`overlay-guide-handle ${axis} ${edgeClass} ${selectedClass}`}
                    style={style}
                    aria-label={`${axisLabel}-Hilfslinie ${value} verschieben`}
                    title="Ziehen zum Verschieben · Pfeiltasten: 1 px · Shift: 10 px · Entf: entfernen"
                    onFocus={() => onSelect({axis, value: original})}
                    onPointerDown={(event) => startGuideDrag(event, axis, original)}
                    onPointerMove={moveGuide}
                    onPointerUp={finishGuideDrag}
                    onPointerCancel={finishGuideDrag}
                    onLostPointerCapture={finishGuideDrag}
                    onKeyDown={(event) => moveGuideWithKeyboard(event, {axis, value, original})}
                >
                    <span>
                        {axisLabel} {value}
                    </span>
                </button>
            )
        })
    }

    function renderRuler(axis: keyof Guides) {
        const horizontal = axis === "horizontal"
        const end = horizontal ? layout.width : layout.height
        const baseStep = horizontal ? 160 : 120
        const minimumLabelSpacing = horizontal ? 48 : 64
        const pixelsBetweenTicks = baseStep * (scale || 1)
        const tickInterval = Math.max(1, Math.ceil(minimumLabelSpacing / pixelsBetweenTicks))
        const step = baseStep * tickInterval
        return (
            <button
                type="button"
                className={`overlay-ruler ${horizontal ? "top" : "left"}`}
                disabled={guides[axis].length >= MAX_OVERLAY_GUIDES}
                aria-label={
                    horizontal
                        ? "Oben ziehen: horizontale Hilfslinie erstellen"
                        : "Links ziehen: vertikale Hilfslinie erstellen"
                }
                title="In die Vorschau ziehen · Enter erstellt eine Linie in der Mitte"
                onPointerDown={(event) => startGuideDrag(event, axis)}
                onPointerMove={moveGuide}
                onPointerUp={finishGuideDrag}
                onPointerCancel={finishGuideDrag}
                onLostPointerCapture={finishGuideDrag}
                onClick={(event) => {
                    if (event.detail !== 0) return
                    onAdd(axis)
                }}
            >
                {Array.from({length: Math.ceil(end / step)}, (_, index) => (
                    <span
                        key={index}
                        style={
                            horizontal
                                ? {left: `${((index * step) / end) * 100}%`}
                                : {top: `${((index * step) / end) * 100}%`}
                        }
                    >
                        {index * step}
                    </span>
                ))}
            </button>
        )
    }

    return (
        <div className="overlay-rulers">
            <span className="overlay-ruler-origin" aria-hidden="true">
                px
            </span>
            {renderRuler("horizontal")}
            {renderRuler("vertical")}
            <div className="overlay-ruler-canvas">
                {children}
                <div className="overlay-guide-handles">{axes.map(renderGuideHandles)}</div>
            </div>
        </div>
    )
}
