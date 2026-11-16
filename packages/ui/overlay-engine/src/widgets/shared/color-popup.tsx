"use client"

import {useEffect, useRef, useState} from "react"

export function ColorPopup({
    value,
    onPreview,
    onCommit,
    onRevert
}: {
    value: string
    onPreview: (next: string) => void
    onCommit: (next: string) => void
    onRevert: () => void
}) {
    const initial = parseHex(value)
    const [state, setState] = useState<PopupState>(initial)
    const [hexText, setHexText] = useState(colorHex(initial))
    const [alphaText, setAlphaText] = useState(String(Math.round((initial.alpha / 255) * 100)))
    const rootRef = useRef<HTMLDivElement>(null)
    const svRef = useRef<HTMLDivElement>(null)
    const hueRef = useRef<HTMLDivElement>(null)
    const alphaRef = useRef<HTMLDivElement>(null)
    const stateRef = useRef(state)
    stateRef.current = state

    useEffect(() => {
        function onPointerDown(event: PointerEvent) {
            if (!rootRef.current?.contains(event.target as Node)) onCommit(toColor(stateRef.current))
        }
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") onCommit(toColor(stateRef.current))
        }
        document.addEventListener("pointerdown", onPointerDown)
        document.addEventListener("keydown", onKeyDown)
        return () => {
            document.removeEventListener("pointerdown", onPointerDown)
            document.removeEventListener("keydown", onKeyDown)
        }
    }, [onCommit])

    function toColor(state: PopupState) {
        const {r, g, b} = hsvToRgb(state.h, state.s, state.v)
        const hex = `#${[r, g, b].map((part) => part.toString(16).padStart(2, "0")).join("")}`
        const alphaHex = Math.round(state.alpha).toString(16).padStart(2, "0")
        return hex + (alphaHex === "ff" ? "" : alphaHex)
    }

    function emit(next: PopupState, options?: {fromHex?: boolean}) {
        stateRef.current = next
        setState(next)
        const solid = hsvToRgb(next.h, next.s, next.v)
        if (!options?.fromHex) {
            setHexText(
                `#${[solid.r, solid.g, solid.b].map((part) => part.toString(16).padStart(2, "0")).join("")}`.toUpperCase()
            )
        }
        setAlphaText(String(Math.round((next.alpha / 255) * 100)))
        onPreview(toColor(next))
    }

    function trackPointer(
        ref: React.RefObject<HTMLDivElement | null>,
        onMove: (xRatio: number, yRatio: number) => void
    ) {
        function move(event: PointerEvent) {
            const rect = ref.current?.getBoundingClientRect()
            if (!rect) return
            const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
            const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))
            onMove(x, y)
        }
        function up() {
            window.removeEventListener("pointermove", move)
            window.removeEventListener("pointerup", up)
        }
        window.addEventListener("pointermove", move)
        window.addEventListener("pointerup", up)
    }

    return (
        <div className="overlay-color-popup" ref={rootRef} role="dialog" aria-label="Farbe bearbeiten">
            <div
                ref={svRef}
                className="overlay-color-sv"
                style={{
                    background:
                        "linear-gradient(to bottom, rgba(0, 0, 0, 0), #000000), linear-gradient(to right, #ffffff, rgba(255, 255, 255, 0))",
                    backgroundColor: `hsl(${state.h} 100% 50%)`
                }}
                onPointerDown={(event) => {
                    event.preventDefault()
                    const pick = (xRatio: number, yRatio: number) =>
                        emit({...stateRef.current, s: xRatio, v: 1 - yRatio})
                    const rect = svRef.current?.getBoundingClientRect()
                    if (rect) {
                        const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
                        const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))
                        pick(x, y)
                    }
                    trackPointer(svRef, pick)
                }}
            >
                <span
                    className="overlay-color-popup-handle"
                    style={{left: `${state.s * 100}%`, top: `${(1 - state.v) * 100}%`}}
                />
            </div>
            <div
                ref={hueRef}
                className="overlay-color-hue"
                onPointerDown={(event) => {
                    event.preventDefault()
                    const pick = (xRatio: number) => emit({...stateRef.current, h: xRatio * 360})
                    const rect = hueRef.current?.getBoundingClientRect()
                    if (rect) pick(Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)))
                    trackPointer(hueRef, pick)
                }}
            >
                <span
                    className="overlay-color-popup-hue-handle"
                    style={{left: `calc(${(state.h / 360) * 100}% - 2px)`}}
                />
            </div>
            <div
                ref={alphaRef}
                className="overlay-color-alpha"
                onPointerDown={(event) => {
                    event.preventDefault()
                    const pick = (xRatio: number) => emit({...stateRef.current, alpha: xRatio * 255})
                    const rect = alphaRef.current?.getBoundingClientRect()
                    if (rect) pick(Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)))
                    trackPointer(alphaRef, pick)
                }}
            >
                <span
                    className="overlay-color-popup-alpha-handle"
                    style={{left: `calc(${(state.alpha / 255) * 100}% - 2px)`}}
                />
            </div>
            <div className="overlay-color-popup-fields">
                <input
                    type="text"
                    className="overlay-field-input"
                    value={hexText}
                    maxLength={7}
                    spellCheck={false}
                    autoComplete="off"
                    aria-label="Hex-Farbe"
                    onChange={(event) => {
                        const text = event.target.value
                        setHexText(text)
                        const match = /^#[0-9a-fA-F]{6}$/.exec(text)
                        if (match) {
                            const r = parseInt(text.slice(1, 3), 16)
                            const g = parseInt(text.slice(3, 5), 16)
                            const b = parseInt(text.slice(5, 7), 16)
                            const hsv = rgbToHsv(r, g, b)
                            emit({h: hsv.h, s: hsv.s, v: hsv.v, alpha: stateRef.current.alpha}, {fromHex: true})
                        }
                    }}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") onCommit(toColor(stateRef.current))
                    }}
                />
                {}
                <span className="overlay-color-popup-alpha-field">
                    <input
                        type="text"
                        inputMode="numeric"
                        value={alphaText}
                        maxLength={3}
                        spellCheck={false}
                        autoComplete="off"
                        aria-label="Deckkraft in Prozent"
                        style={{width: `${Math.max(1, alphaText.length)}ch`}}
                        onChange={(event) => {
                            const digits = event.target.value.replace(/\D/g, "")
                            if (digits === "") {
                                setAlphaText("")
                                return
                            }
                            const clamped = Math.min(100, Math.max(0, Number.parseInt(digits, 10)))
                            setAlphaText(String(clamped))
                            emit({...stateRef.current, alpha: (clamped / 100) * 255})
                        }}
                        onBlur={() => setAlphaText(String(Math.round((stateRef.current.alpha / 255) * 100)))}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") onCommit(toColor(stateRef.current))
                        }}
                    />
                    <span className="overlay-color-popup-alpha-suffix" aria-hidden="true">
                        %
                    </span>
                </span>
            </div>
            <div className="overlay-color-popup-actions">
                <button
                    type="button"
                    className="button"
                    onClick={() => {
                        onPreview(value)
                        onRevert()
                    }}
                >
                    Abbrechen
                </button>
                <button type="button" className="button primary" onClick={() => onCommit(toColor(stateRef.current))}>
                    OK
                </button>
            </div>
        </div>
    )
}

type PopupState = {h: number; s: number; v: number; alpha: number}

function parseHex(value: string): PopupState {
    const hex = value === "transparent" ? "17182100" : value.slice(1)
    const expanded = hex.length <= 4 ? [...hex].map((character) => character.repeat(2)).join("") : hex
    const r = parseInt(expanded.slice(0, 2), 16)
    const g = parseInt(expanded.slice(2, 4), 16)
    const b = parseInt(expanded.slice(4, 6), 16)
    const alpha = expanded.slice(6) ? parseInt(expanded.slice(6, 8), 16) : 255
    const hsv = rgbToHsv(r, g, b)
    return {h: hsv.h, s: hsv.s, v: hsv.v, alpha}
}

function colorHex(state: PopupState) {
    const {r, g, b} = hsvToRgb(state.h, state.s, state.v)
    return `#${[r, g, b].map((part) => part.toString(16).padStart(2, "0")).join("")}`.toUpperCase()
}

function hsvToRgb(h: number, s: number, v: number) {
    const i = Math.floor((h / 60) % 6)
    const f = h / 60 - i
    const p = v * (1 - s)
    const q = v * (1 - f * s)
    const t = v * (1 - (1 - f) * s)
    let [r, g, b] = [v, v, v]
    if (i === 0) [r, g, b] = [v, t, p]
    else if (i === 1) [r, g, b] = [q, v, p]
    else if (i === 2) [r, g, b] = [p, v, t]
    else if (i === 3) [r, g, b] = [p, q, v]
    else if (i === 4) [r, g, b] = [t, p, v]
    else [r, g, b] = [v, p, q]
    return {r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255)}
}

function rgbToHsv(r: number, g: number, b: number) {
    const rr = r / 255
    const gg = g / 255
    const bb = b / 255
    const max = Math.max(rr, gg, bb)
    const min = Math.min(rr, gg, bb)
    const d = max - min
    let h = 0
    if (d !== 0) {
        if (max === rr) h = ((gg - bb) / d) % 6
        else if (max === gg) h = (bb - rr) / d + 2
        else h = (rr - gg) / d + 4
        h *= 60
        if (h < 0) h += 360
    }
    return {h, s: max === 0 ? 0 : d / max, v: max}
}
