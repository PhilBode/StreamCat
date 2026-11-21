import {WidgetParamError, type WidgetAppearance, type WidgetSpec} from "./types"

export type MediaWidgetParams = WidgetAppearance & {
    assetId: string
    fit?: "contain" | "cover"
}

export const mediaSpec: WidgetSpec<MediaWidgetParams> = {
    width: 480,
    height: 270,
    defaults(appearance) {
        return {
            ...appearance,
            assetId: "",
            fit: "contain"
        }
    },
    parse(raw, {appearance}) {
        if (typeof raw.assetId !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(raw.assetId))
            throw new WidgetParamError("Wähle ein hochgeladenes Medium für dieses Widget.")
        if (raw.fit !== undefined && raw.fit !== "contain" && raw.fit !== "cover")
            throw new WidgetParamError("Ungültige Medien-Skalierung.")
        return {
            ...appearance,
            assetId: raw.assetId,
            fit: raw.fit === "cover" ? "cover" : "contain"
        }
    },
    normalize(stored, appearance) {
        const raw = stored ?? {}
        return {
            ...appearance,
            assetId: typeof raw.assetId === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(raw.assetId) ? raw.assetId : "",
            fit: raw.fit === "cover" ? "cover" : "contain"
        }
    }
}
