"use client"

import {useState} from "react"
import {
    overlayPreset,
    type OverlayLayout,
    type OverlayScene,
    type OverlayTheme,
    type OverlayFont
} from "@streamcat/interfaces"

export function SceneSettings({layout, onChange}: {layout: OverlayLayout; onChange: (layout: OverlayLayout) => void}) {
    const [presetScene, setPresetScene] = useState<OverlayScene>(
        layout.scene && layout.scene !== "widgets" ? layout.scene : "intermission"
    )
    const [presetConfirm, setPresetConfirm] = useState(false)

    function changeTheme(theme: OverlayTheme) {
        onChange({...layout, theme})
    }

    function loadPreset() {
        onChange({
            ...overlayPreset(presetScene, [crypto.randomUUID(), crypto.randomUUID()], layout.theme),
            font: layout.font ?? "tiny5",
            socials: layout.socials,
            guides: layout.guides
        })
        setPresetConfirm(false)
    }

    return (
        <>
            <h2>Standard-Overlay</h2>
            <label className="overlay-theme-control">
                Vorlage
                <select value={presetScene} onChange={(event) => setPresetScene(event.target.value as OverlayScene)}>
                    <option value="intermission">Intermission</option>
                    <option value="starting_soon">Starting Soon</option>
                    <option value="stream_ending">Stream Ending</option>
                </select>
            </label>
            {presetConfirm ? (
                <div className="overlay-preset-confirm">
                    <p className="muted overlay-hint">
                        Die Vorlage ersetzt deine Widgets und ihre Anordnung in der Vorschau. Erst Speichern übernimmt
                        sie in OBS.
                    </p>
                    <div className="actions">
                        <button className="button" onClick={loadPreset}>
                            Vorlage übernehmen
                        </button>
                        <button className="button" onClick={() => setPresetConfirm(false)}>
                            Abbrechen
                        </button>
                    </div>
                </div>
            ) : (
                <button className="button" onClick={() => setPresetConfirm(true)}>
                    Standardlayout laden
                </button>
            )}
            <label className="overlay-checkbox overlay-scene-toggle">
                <input
                    type="checkbox"
                    checked={(layout.scene ?? "widgets") === "widgets"}
                    onChange={(event) => onChange({...layout, scene: event.target.checked ? "widgets" : presetScene})}
                />
                Nur Widgets · transparenter Hintergrund
            </label>
            <label className="overlay-theme-control">
                Design
                <select value={layout.theme} onChange={(event) => changeTheme(event.target.value as OverlayTheme)}>
                    <option value="default">Standard</option>
                    <option value="autumn">Herbst</option>
                    <option value="winter">Winter</option>
                </select>
            </label>
            <p className="muted overlay-hint">
                Gilt nur für Hintergrund, Titel und Taskbar. Widget-Designs stellst du pro Widget ein.
            </p>
            <label className="overlay-theme-control">
                Schrift für Fenster und Spotify
                <select
                    value={layout.font ?? "tiny5"}
                    onChange={(event) => onChange({...layout, font: event.target.value as OverlayFont})}
                >
                    <option value="tiny5">Tiny5 · Original</option>
                    <option value="jersey10">Jersey 10</option>
                </select>
            </label>
            <details className="overlay-social-settings">
                <summary>Socials im Standard-Overlay</summary>
                {(["twitch", "twitter", "discord"] as const).map((provider) => (
                    <label key={provider} className="overlay-theme-control">
                        {{twitch: "Twitch", twitter: "Twitter", discord: "Discord"}[provider]}
                        <input
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
                                onChange({...layout, socials: {...layout.socials, [provider]: event.target.value}})
                            }
                        />
                    </label>
                ))}
            </details>
        </>
    )
}
