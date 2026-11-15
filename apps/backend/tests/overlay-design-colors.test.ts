import "reflect-metadata"
import {expect, test} from "bun:test"
import {OverlayService} from "../src/features/overlays/services/overlay.service"

const date = new Date(0)
const overlay = {
    guildId: "guild",
    id: "scene",
    name: "Scene",
    tokenHash: "a".repeat(64),
    type: "STATIC" as const,
    backgroundAssetId: null,
    settings: {theme: "default", font: "tiny5"},
    customHtml: null,
    customCss: null,
    updatedAt: date,
    widgets: [
        {
            id: "widget",
            overlayId: "scene",
            type: "SPOTIFY_NOW_PLAYING" as const,
            x: 0,
            y: 0,
            width: 640,
            height: 300,
            zIndex: 1,
            params: {
                design: "default",
                color: "#ffffff",
                backgroundColor: "#000000",
                designColors: {"--progress-color": "#ff0000"}
            },
            createdAt: date,
            updatedAt: date
        }
    ]
}

const logger = {forModule: () => ({info() {}, warn() {}, error() {}})}
const service = new OverlayService(
    {findScenes: async () => [overlay]} as never,
    {} as never,
    {} as never,
    logger as never,
    {} as never
)

test("stored design color overrides survive the dashboard mapping", async () => {
    const [scene] = await service.scenes("guild")
    expect(scene?.layout.widgets[0]?.params.designColors).toEqual({"--progress-color": "#ff0000"})
})
