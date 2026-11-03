"use client"

export function ColorField({
    label,
    value,
    onChange
}: {
    label: string
    value: string
    onChange: (value: string) => void
}) {
    // Expand legacy CSS shorthand so the native picker always receives #RRGGBB.
    const hex = value === "transparent" ? "17182100" : value.slice(1)
    const expanded = hex.length <= 4 ? [...hex].map((character) => character.repeat(2)).join("") : hex
    const rgb = `#${expanded.slice(0, 6)}`
    const alpha = expanded.slice(6) || "ff"
    const opacity = Math.round((parseInt(alpha, 16) / 255) * 100)

    function changeOpacity(value: string) {
        if (!value) return
        const percent = Number(value)
        if (!Number.isFinite(percent)) return
        const alpha = Math.round((Math.max(0, Math.min(100, percent)) / 100) * 255)
            .toString(16)
            .padStart(2, "0")
        onChange(rgb + alpha)
    }

    return (
        <div className="overlay-color-field">
            <span>{label}</span>
            <div className="overlay-color-controls">
                <input
                    type="color"
                    aria-label={label}
                    value={rgb}
                    onChange={(event) => onChange(event.target.value + alpha)}
                />
                <span className="overlay-color-preview" aria-hidden="true">
                    <span style={{backgroundColor: rgb + alpha}} />
                </span>
                <label className="overlay-color-opacity">
                    Deckkraft
                    <span>
                        <input
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            value={opacity}
                            aria-label={`${label} Deckkraft in Prozent`}
                            onChange={(event) => changeOpacity(event.target.value)}
                        />
                        %
                    </span>
                </label>
            </div>
            <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={opacity}
                aria-label={`${label} Deckkraft`}
                onChange={(event) => changeOpacity(event.target.value)}
            />
        </div>
    )
}
