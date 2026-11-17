"use client"

import {useState} from "react"
import {
    OVERLAY_COLOR_TEMPLATES,
    overlayPreset,
    type OverlayLayout,
    type OverlayScene,
    type OverlayTheme,
    type OverlayFont
} from "@streamcat/interfaces"
import {SidebarSection, Select} from "../ui/dialog"
import {ColorField} from "../widgets/shared/color-field"

export function SceneSidebar({
    layout,
    onChange,
    onEditStart,
    onEditEnd,
    only = "all"
}: {
    layout: OverlayLayout
    onChange: (layout: OverlayLayout) => void
    onEditStart?: () => void
    onEditEnd?: () => void
    only?: "theme" | "scene" | "all"
}) {
    const [presetScene, setPresetScene] = useState<OverlayScene>(
        layout.scene && layout.scene !== "widgets" ? layout.scene : "intermission"
    )
    const [presetConfirm, setPresetConfirm] = useState(false)
    const colors = OVERLAY_COLOR_TEMPLATES[layout.theme === "default" ? "standard" : layout.theme]

    function changeTheme(theme: OverlayTheme) {
        onChange({...layout, theme, themeColors: undefined})
    }

    function changeThemeColor(key: keyof NonNullable<OverlayLayout["themeColors"]>, value: string) {
        onChange({
            ...layout,
            themeColors: {...layout.themeColors, [key]: value}
        })
    }

    function loadPreset() {
        onChange({
            ...overlayPreset(presetScene, [crypto.randomUUID(), crypto.randomUUID()], layout.theme),
            themeColors: undefined,
            font: layout.font ?? "tiny5",
            socials: layout.socials,
            guides: layout.guides
        })
        setPresetConfirm(false)
    }

    const overrides = layout.themeColors
    const themeOptions = [
        {value: "default", label: "Standard"},
        {value: "autumn", label: "Herbst"},
        {value: "winter", label: "Winter"},
        ...(overrides ? [{value: "custom", label: "Custom"}] : [])
    ]
    const paletteRows: [string, keyof NonNullable<OverlayLayout["themeColors"]>, string, string][] = [
        ["Primär", "primary", colors.tokens?.["--progress-color"] ?? "#1db954", "100%"],
        ["Sekundär", "secondary", colors.color, "100%"],
        ["Fläche", "surface", colors.backgroundColor, alphaLabel(colors.backgroundColor)],
        ["Fenster", "window", colors.tokens?.["--window-bg"] ?? "#1b191c", "100%"],
        ["Text", "text", colors.color, "100%"]
    ]

    const themeLabelText = overrides ? "Custom" : themeLabel(layout.theme)
    return (
        <div className="overlay-scene-settings">
            {only !== "scene" && (
                <div className="overlay-settings-block">
                    <SidebarSection label="Theme" defaultOpen summary={`${themeLabelText} - 5 Farben`}>
                        <Select
                            label="Preset"
                            value={overrides ? "custom" : layout.theme}
                            options={themeOptions}
                            onChange={(value) => value !== "custom" && changeTheme(value as OverlayTheme)}
                        />
                        <div className="overlay-color-list overlay-scene-palette">
                            {paletteRows.map(([label, key, fallback, opacity]) => (
                                <ColorField
                                    key={label}
                                    label={label}
                                    value={overrides?.[key] ?? fallback}
                                    onChange={(value) => changeThemeColor(key, value)}
                                    onEditStart={onEditStart}
                                    onEditEnd={onEditEnd}
                                />
                            ))}
                        </div>
                        <p className="overlay-settings-hint">
                            Gilt für alle Widgets. Das Widget-Design kann Farben überschreiben.
                        </p>
                    </SidebarSection>
                </div>
            )}
            {only !== "theme" && (
                <>
                    <div className="overlay-settings-block">
                        <SidebarSection label="Schrift">
                            <Select
                                label="Schrift für Fenster und Spotify"
                                value={layout.font ?? "tiny5"}
                                options={[
                                    {value: "tiny5", label: "Tiny5 · Original"},
                                    {value: "jersey10", label: "Jersey 10"}
                                ]}
                                onChange={(value) => onChange({...layout, font: value as OverlayFont})}
                            />
                        </SidebarSection>
                    </div>
                    <div className="overlay-settings-block">
                        <SidebarSection label="In OBS ausrichten">
                            <div className="overlay-field">
                                <span className="overlay-field-label">OBS-Basisauflösung</span>
                                <input className="overlay-field-input" value="1920 × 1080" readOnly disabled />
                            </div>
                            <p className="overlay-settings-hint">
                                Die Ausgabe skaliert auf die Auflösung deiner OBS-Browser-Quelle.
                            </p>
                        </SidebarSection>
                    </div>
                    <div className="overlay-settings-block">
                        <SidebarSection label="Startlayout">
                            <Select
                                label="Vorlage"
                                value={presetScene}
                                options={[
                                    {value: "intermission", label: "Intermission"},
                                    {value: "starting_soon", label: "Starting Soon"},
                                    {value: "stream_ending", label: "Stream Ending"}
                                ]}
                                onChange={(value) => setPresetScene(value as OverlayScene)}
                            />
                            {presetConfirm ? (
                                <div className="overlay-preset-confirm">
                                    <p className="overlay-settings-hint">
                                        Die Vorlage ersetzt deine Widgets und ihre Anordnung in der Vorschau. Erst
                                        Speichern übernimmt sie in OBS.
                                    </p>
                                    <div className="actions">
                                        <button type="button" className="button" onClick={loadPreset}>
                                            Vorlage übernehmen
                                        </button>
                                        <button
                                            type="button"
                                            className="button"
                                            onClick={() => setPresetConfirm(false)}
                                        >
                                            Abbrechen
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button type="button" className="button" onClick={() => setPresetConfirm(true)}>
                                    Standardlayout laden
                                </button>
                            )}
                            <label className="overlay-check overlay-scene-toggle">
                                <input
                                    type="checkbox"
                                    className="overlay-check-input"
                                    checked={(layout.scene ?? "widgets") === "widgets"}
                                    onChange={(event) =>
                                        onChange({...layout, scene: event.target.checked ? "widgets" : presetScene})
                                    }
                                />
                                <span className="overlay-check-box" aria-hidden="true" />
                                Nur Widgets · transparenter Hintergrund
                            </label>
                        </SidebarSection>
                    </div>
                    <div className="overlay-settings-block">
                        <SidebarSection label="Socials im Standard-Overlay">
                            {(["twitch", "twitter", "discord"] as const).map((provider) => (
                                <label key={provider} className="overlay-field">
                                    <span className="overlay-field-label">
                                        {{twitch: "Twitch", twitter: "Twitter", discord: "Discord"}[provider]}
                                    </span>
                                    <input
                                        className="overlay-field-input"
                                        maxLength={100}
                                        value={layout.socials?.[provider] ?? ""}
                                        placeholder={
                                            provider === "twitch"
                                                ? "Verknüpfter Kanal"
                                                : provider === "twitter"
                                                  ? "@deinname"
                                                  : "Dein Discord-Einladungslink"
                                        }
                                        onChange={(event) =>
                                            onChange({
                                                ...layout,
                                                socials: {...layout.socials, [provider]: event.target.value}
                                            })
                                        }
                                    />
                                </label>
                            ))}
                        </SidebarSection>
                    </div>
                </>
            )}
        </div>
    )
}

function themeLabel(theme: OverlayTheme) {
    if (theme === "autumn") return "Herbst"
    if (theme === "winter") return "Winter"
    return "Standard"
}

function alphaLabel(backgroundColor: string) {
    const alpha = backgroundColor.slice(7) || "ff"
    return `${Math.round((parseInt(alpha, 16) / 255) * 100)}%`
}
