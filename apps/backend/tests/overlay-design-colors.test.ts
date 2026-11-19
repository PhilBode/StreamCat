import "reflect-metadata"
import {expect, test} from "bun:test"
import {OverlayService} from "../src/features/overlays/services/overlay.service"

const date = new Date(0)
const overlay = {
    guildId: "guild",
    id: "scene",
    name: "Scene",
    tokenHash: "a".repeat(64),
    browserToken: "encrypted-token",
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
    {
        findScenes: async () => [overlay],
        findBrowserTokens: async () => [{id: overlay.id, browserToken: overlay.browserToken}]
    } as never,
    {} as never,
    {} as never,
    logger as never,
    {} as never,
    {decrypt: async () => "browser-token"} as never
)

test("stored design color overrides survive the dashboard mapping", async () => {
    const [scene] = await service.scenes("guild")
    expect(scene?.layout.widgets[0]?.params.designColors).toEqual({"--progress-color": "#ff0000"})
})

test("stored browser tokens are returned as scene links", async () => {
    const links = await service.sceneLinks("guild")
    expect(links.scene).toMatch(/\/overlay#browser-token$/)
})

test("a broken stored browser token does not fail the link list", async () => {
    const broken = new OverlayService(
        {findBrowserTokens: async () => [{id: "scene", browserToken: "broken"}]} as never,
        {} as never,
        {} as never,
        logger as never,
        {} as never,
        {
            decrypt: async () => {
                throw new Error("bad key")
            }
        } as never
    )
    expect(await broken.sceneLinks("guild")).toEqual({})
})
