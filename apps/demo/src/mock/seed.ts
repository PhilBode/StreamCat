import {
    overlayPreset,
    type GuildOverlay,
    type OverlayAsset,
    type OverlayLayout,
    type OverlayPlayback,
    type OverlayScene,
    type OverlayTheme
} from "@streamcat/interfaces"

export const DEMO_GUILD_ID = "demo"
export const DEMO_BASE_PATH = "/demo/overlay"
export const DEMO_TRACK_NAME = "Midnight Drive"
export const DEMO_TRACK_ARTIST = "Demo Artist"
export const DEMO_TRACK_DURATION_MS = 218_000

export const DEMO_ASSETS: OverlayAsset[] = []

type Seed = {
    id: string
    name: string
    scene: OverlayScene
    theme: OverlayTheme
}

const SEEDS: Seed[] = [
    {id: "demo-intermission", name: "Intermission", scene: "intermission", theme: "default"},
    {id: "demo-starting-soon", name: "Starting Soon", scene: "starting_soon", theme: "autumn"},
    {id: "demo-stream-ending", name: "Stream Ending", scene: "stream_ending", theme: "winter"}
]

function tuneLayout(layout: OverlayLayout): OverlayLayout {
    return {
        ...layout,
        socials: {twitch: "streamcatdemo", twitter: "streamcatdemo", discord: "streamcatdemo"},
        widgets: layout.widgets.map((widget) => {
            if (widget.type === "SPOTIFY_NOW_PLAYING") {
                return {
                    ...widget,
                    params: {
                        ...widget.params,
                        spectralizer: true,
                        spectrumMode: "simulated" as const,
                        audioDeviceName: ""
                    }
                }
            }
            if (widget.type === "TWITCH_CHAT") {
                return {...widget, params: {...widget.params, design: "windowed"}}
            }
            return widget
        })
    }
}

export function createDemoOverlay(
    scene: OverlayScene,
    name: string,
    id: string,
    theme: OverlayTheme = "default"
): GuildOverlay {
    const layout = tuneLayout(overlayPreset(scene, [`${id}-chat`, `${id}-spotify`], theme))
    return {id, guildId: DEMO_GUILD_ID, name, layout}
}

export function seedScenes(): GuildOverlay[] {
    return SEEDS.map((seed) => createDemoOverlay(seed.scene, seed.name, seed.id, seed.theme))
}

export function demoPlayback(): OverlayPlayback {
    const now = Date.now()
    return {
        status: "playing",
        text: DEMO_TRACK_NAME,
        name: DEMO_TRACK_NAME,
        artist: DEMO_TRACK_ARTIST,
        albumUrl: null,
        progressMs: now % DEMO_TRACK_DURATION_MS,
        durationMs: DEMO_TRACK_DURATION_MS,
        sampledAt: now
    }
}
