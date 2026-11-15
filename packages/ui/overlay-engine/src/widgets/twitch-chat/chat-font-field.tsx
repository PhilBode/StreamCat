"use client"

import {useId} from "react"
import {TWITCH_CHAT_DEFAULTS, TWITCH_CHAT_FONTS} from "@streamcat/interfaces"

export function ChatFontField({
    value = TWITCH_CHAT_DEFAULTS.chatFont,
    onChange
}: {
    value?: number | string
    onChange: (font: number | string) => void
}) {
    const suggestions = useId()
    const name = typeof value === "number" ? (TWITCH_CHAT_FONTS[value] ?? "Roboto") : value

    function apply(input: string) {
        const name = input.trim()
        const index = TWITCH_CHAT_FONTS.findIndex((font) => font.toLowerCase() === name.toLowerCase())
        const font = !name ? TWITCH_CHAT_DEFAULTS.chatFont : index >= 0 ? index : name
        if (font !== value) onChange(font)
    }

    return (
        <>
            <label className="overlay-theme-control">
                Chat-Schrift
                <input
                    key={value}
                    type="text"
                    list={suggestions}
                    defaultValue={name}
                    maxLength={100}
                    autoComplete="off"
                    placeholder="Schrift suchen oder eigenen Namen eingeben"
                    onBlur={(event) => apply(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            event.preventDefault()
                            event.currentTarget.blur()
                        }
                    }}
                />
            </label>
            <datalist id={suggestions}>
                {["Tiny5", "Jersey 10", ...TWITCH_CHAT_FONTS].map((font) => (
                    <option key={font} value={font} />
                ))}
            </datalist>
            <p className="muted overlay-hint">Eigene Google-Fonts-Schrift eingeben und mit Enter übernehmen.</p>
        </>
    )
}
