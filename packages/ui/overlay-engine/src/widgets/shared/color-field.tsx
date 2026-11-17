"use client"

import {useState} from "react"
import {ColorPopup} from "./color-popup"

export function ColorField({
    label,
    value,
    onChange,
    onEditStart,
    onEditEnd
}: {
    label: string
    value: string
    onChange: (value: string) => void
    onEditStart?: () => void
    onEditEnd?: () => void
}) {
    
    const hex = value === "transparent" ? "17182100" : value.slice(1)
    const expanded = hex.length <= 4 ? [...hex].map((character) => character.repeat(2)).join("") : hex
    const rgb = `#${expanded.slice(0, 6)}`
    const alpha = expanded.slice(6) || "ff"
    const opacity = Math.round((parseInt(alpha, 16) / 255) * 100)
    const [popupOpen, setPopupOpen] = useState(false)
    const [original, setOriginal] = useState(value)

    return (
        <div className="overlay-color-field">
            <span className="overlay-color-label">{label}</span>
            <div className="overlay-color-controls">
                <span className="overlay-color-swatch" style={{background: rgb + alpha}} aria-hidden="true" />
                <span className="overlay-color-hex">{rgb.toUpperCase()}</span>
                <span className="overlay-color-opacity">{opacity}%</span>
                <span className="overlay-color-edit-anchor">
                    <button
                        type="button"
                        className="overlay-color-edit"
                        aria-label={`${label} bearbeiten`}
                        aria-expanded={popupOpen}
                        onPointerDown={(event) => {
                            
                            
                            event.stopPropagation()
                        }}
                        onClick={() => {
                            if (popupOpen) {
                                
                                onEditEnd?.()
                                setPopupOpen(false)
                            } else {
                                setOriginal(value)
                                onEditStart?.()
                                setPopupOpen(true)
                            }
                        }}
                    >
                        <svg
                            aria-hidden="true"
                            width="12"
                            height="12"
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
                    {popupOpen && (
                        <ColorPopup
                            value={value}
                            onPreview={onChange}
                            onCommit={(next) => {
                                onChange(next)
                                onEditEnd?.()
                                setPopupOpen(false)
                            }}
                            onRevert={() => {
                                onChange(original)
                                onEditEnd?.()
                                setPopupOpen(false)
                            }}
                        />
                    )}
                </span>
            </div>
        </div>
    )
}
