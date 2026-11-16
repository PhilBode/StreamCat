import type {EditorWidget} from "@streamcat/interfaces"
import type {WidgetSettingsProps} from "../../types"
import {Select} from "../../../ui/dialog"

export function SpotifySettings({widget: value, onChange, previewAudio, onPreviewAudioChange}: WidgetSettingsProps) {
    const widget = value as Extract<EditorWidget, {type: "SPOTIFY_NOW_PLAYING"}>
    return (
        <>
            <label className="overlay-check">
                <input
                    type="checkbox"
                    className="overlay-check-input"
                    checked={widget.params.spectralizer === true}
                    onChange={(event) =>
                        onChange({...widget, params: {...widget.params, spectralizer: event.target.checked}})
                    }
                />
                <span className="overlay-check-box" aria-hidden="true" />
                Spektrum anzeigen
            </label>
            {widget.params.spectralizer && (
                <>
                    <Select
                        label="Modus"
                        value={widget.params.spectrumMode ?? "audio"}
                        options={[
                            {value: "audio", label: "Audioeingang · echtes Spektrum"},
                            {value: "simulated", label: "Simuliert · ohne Audiofreigabe"}
                        ]}
                        onChange={(value) =>
                            onChange({
                                ...widget,
                                params: {
                                    ...widget.params,
                                    spectrumMode: value as "audio" | "simulated"
                                }
                            })
                        }
                    />
                    {widget.params.spectrumMode === "simulated" ? (
                        <p className="overlay-settings-hint">
                            Dekorative Animation ohne Audiozugriff. Sie reagiert nicht auf den Song und pausiert mit der
                            Spotify-Wiedergabe.
                        </p>
                    ) : (
                        <>
                            <label className="overlay-field">
                                <span className="overlay-field-label">Audioeingang</span>
                                <input
                                    className="overlay-field-input"
                                    value={widget.params.audioDeviceName ?? ""}
                                    maxLength={200}
                                    placeholder="Standard oder z. B. BlackHole"
                                    onChange={(event) =>
                                        onChange({
                                            ...widget,
                                            params: {...widget.params, audioDeviceName: event.target.value}
                                        })
                                    }
                                />
                            </label>
                            {onPreviewAudioChange && (
                                <button
                                    type="button"
                                    className="button"
                                    onClick={() => onPreviewAudioChange(!previewAudio)}
                                >
                                    {previewAudio ? "Audio-Vorschau stoppen" : "Audio-Vorschau starten"}
                                </button>
                            )}
                            <p className="overlay-settings-hint">
                                Das echte Spektrum nutzt deinen lokalen Audioeingang, z. B. einen Loopback-Eingang.
                                Spotify liefert keine Audiodaten. In OBS startet es automatisch.
                            </p>
                        </>
                    )}
                </>
            )}
        </>
    )
}
