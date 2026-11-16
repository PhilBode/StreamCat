"use client"

import {useRef, useState} from "react"
import {createPortal} from "react-dom"
import {TWITCH_CHAT_DEFAULTS, TWITCH_CHAT_FONTS} from "@streamcat/interfaces"
import {ChevronGlyph, useFloatingMenuRect} from "../../../ui/dialog"

const ALL_FONTS = ["Tiny5", "Jersey 10", ...TWITCH_CHAT_FONTS]

export function ChatFontField({
    value = TWITCH_CHAT_DEFAULTS.chatFont,
    onChange
}: {
    value?: number | string
    onChange: (font: number | string) => void
}) {
    const fieldRef = useRef<HTMLInputElement>(null)
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState("")
    const {rootRef, menuRef, rect} = useFloatingMenuRect(open, fieldRef, () => setOpen(false))
    const name = typeof value === "number" ? (TWITCH_CHAT_FONTS[value] ?? "Roboto") : value

    function apply(input: string) {
        const name = input.trim()
        const index = TWITCH_CHAT_FONTS.findIndex((font) => font.toLowerCase() === name.toLowerCase())
        const font = !name ? TWITCH_CHAT_DEFAULTS.chatFont : index >= 0 ? index : name
        if (font !== value) onChange(font)
    }

    const needle = query.trim().toLowerCase()
    const suggestions = needle ? ALL_FONTS.filter((font) => font.toLowerCase().includes(needle)) : ALL_FONTS

    return (
        <div className="overlay-combo" ref={rootRef}>
            <div className="overlay-combo-field">
                <input
                    ref={fieldRef}
                    key={value}
                    className="overlay-select-field overlay-combo-input"
                    type="text"
                    defaultValue={name}
                    maxLength={100}
                    autoComplete="off"
                    aria-label="Chat-Schrift"
                    placeholder="Schrift suchen oder eigenen Namen eingeben"
                    onChange={(event) => {
                        setQuery(event.target.value)
                        setOpen(true)
                    }}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            event.preventDefault()
                            apply(event.currentTarget.value)
                            setOpen(false)
                        }
                    }}
                />
                <button
                    type="button"
                    className="overlay-select-chevron overlay-combo-chevron"
                    aria-haspopup="listbox"
                    aria-expanded={open}
                    aria-label="Schriftliste anzeigen"
                    tabIndex={-1}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                        setQuery("")
                        setOpen((current) => !current)
                    }}
                >
                    <ChevronGlyph direction={open ? "up" : "down"} />
                </button>
                {open &&
                    rect &&
                    createPortal(
                        <ul
                            ref={menuRef}
                            className="overlay-select-list overlay-select-list--floating"
                            role="listbox"
                            aria-label="Schriftvorschläge"
                            style={{
                                left: rect.left,
                                width: rect.width,
                                ...(rect.above ? {bottom: window.innerHeight - rect.top} : {top: rect.top})
                            }}
                        >
                            {suggestions.map((font) => (
                                <li key={font}>
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected={font === name}
                                        className="overlay-select-option"
                                        onMouseDown={(event) => event.preventDefault()}
                                        onClick={() => {
                                            apply(font)
                                            setOpen(false)
                                        }}
                                    >
                                        {font}
                                    </button>
                                </li>
                            ))}
                            {suggestions.length === 0 && (
                                <li>
                                    <span className="overlay-select-option overlay-combo-empty">
                                        Kein Treffer — Eigenen Namen eingeben und mit Enter übernehmen
                                    </span>
                                </li>
                            )}
                        </ul>,
                        document.body
                    )}
            </div>
            <p className="overlay-settings-hint">
                Schrift suchen oder eigenen Google-Fonts-Namen eingeben und mit Enter übernehmen.
            </p>
        </div>
    )
}
