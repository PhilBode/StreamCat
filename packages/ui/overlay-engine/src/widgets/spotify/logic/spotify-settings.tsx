import type {EditorWidget} from "@streamcat/interfaces"

export function SpotifySettings({
    widget,
    onChange,
    previewAudio,
    onPreviewAudioChange
}: {
    widget: Extract<EditorWidget, {type: "SPOTIFY_NOW_PLAYING"}>
    onChange: (widget: EditorWidget) => void
    previewAudio: boolean
    onPreviewAudioChange?: (enabled: boolean) => void
}) {
    return (
        <>
            <label className="overlay-checkbox">
                <input
                    type="checkbox"
                    checked={widget.params.spectralizer === true}
                    onChange={(event) =>
                        onChange({...widget, params: {...widget.params, spectralizer: event.target.checked}})
                    }
                />
                Spektrum
            </label>
            {widget.params.spectralizer && (
                <>
                    <label className="overlay-theme-control">
                        Spektrum-Modus
                        <select
                            value={widget.params.spectrumMode ?? "audio"}
                            onChange={(event) =>
                                onChange({
                                    ...widget,
                                    params: {
                                        ...widget.params,
                                        spectrumMode: event.target.value as "audio" | "simulated"
                                    }
                                })
                            }
                        >
                            <option value="audio">Audioeingang · echtes Spektrum</option>
                            <option value="simulated">Simuliert · ohne Audiofreigabe</option>
                        </select>
                    </label>
                    {widget.params.spectrumMode === "simulated" ? (
                        <p className="muted overlay-hint">
                            Dekorative Animation ohne Audiozugriff. Sie reagiert nicht auf den Song und pausiert mit der
                            Spotify-Wiedergabe.
                        </p>
                    ) : (
                        <>
                            <label className="overlay-theme-control">
                                Audioeingang
                                <input
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
                                <button className="button" onClick={() => onPreviewAudioChange(!previewAudio)}>
                                    {previewAudio ? "Audio-Vorschau stoppen" : "Audio-Vorschau starten"}
                                </button>
                            )}
                            <p className="muted overlay-hint">
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
