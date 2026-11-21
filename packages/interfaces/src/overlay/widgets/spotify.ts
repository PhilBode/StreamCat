import {WidgetParamError, type WidgetAppearance, type WidgetSpec} from "./types"

export type SpotifyWidgetParams = WidgetAppearance & {
    spectralizer?: boolean
    spectrumMode?: "audio" | "simulated"
    audioDeviceName?: string
}

function spectrumMode(value: unknown): "audio" | "simulated" {
    if (value === undefined) return "audio"
    if (value === "audio" || value === "simulated") return value
    throw new WidgetParamError("Unbekannter Spektrum-Modus.")
}

export const spotifySpec: WidgetSpec<SpotifyWidgetParams> = {
    width: 640,
    height: 300,
    defaults(appearance) {
        return {
            ...appearance,
            spectralizer: false,
            spectrumMode: "audio",
            audioDeviceName: ""
        }
    },
    parse(raw, {appearance}) {
        if (raw.spectralizer !== undefined && typeof raw.spectralizer !== "boolean")
            throw new WidgetParamError("Ungültige Spektrum-Einstellung.")
        if (
            raw.audioDeviceName !== undefined &&
            (typeof raw.audioDeviceName !== "string" || raw.audioDeviceName.length > 200)
        )
            throw new WidgetParamError("Ungültiger Audioeingang.")
        return {
            ...appearance,
            spectralizer: raw.spectralizer === true,
            spectrumMode: spectrumMode(raw.spectrumMode),
            audioDeviceName: (raw.audioDeviceName as string | undefined) ?? ""
        }
    },
    normalize(stored, appearance) {
        const raw = stored ?? {}
        return {
            ...appearance,
            spectralizer: raw.spectralizer === true,
            spectrumMode: raw.spectrumMode === "simulated" ? "simulated" : "audio",
            audioDeviceName: typeof raw.audioDeviceName === "string" ? raw.audioDeviceName.slice(0, 200) : ""
        }
    }
}
