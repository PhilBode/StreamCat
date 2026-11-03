import {type OverlayWidgetRecord, OverlayRepository, TwitchAuthRepository, type StoredOverlay} from "@streamcat/db"
import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
    UnauthorizedException
} from "@nestjs/common"
import {createHash, randomBytes, randomUUID} from "node:crypto"
import {BotLoggerService, frontendUrl, type ModuleLogger} from "@streamcat/core"
import {
    overlayPreset,
    OVERLAY_THEME_COLORS,
    OVERLAY_WIDTH,
    OVERLAY_HEIGHT,
    TWITCH_CHAT_DEFAULTS,
    twitchChatUrl,
    type SpotifyWidgetParams,
    type ChatWidgetParams,
    type WindowWidgetParams,
    type MediaWidgetParams,
    type GuildOverlay,
    type OverlayChat,
    type OverlayLink,
    type OverlaySnapshot,
    type OverlayTheme,
    type OverlayScene,
    type EditorWidget
} from "@streamcat/interfaces"
import {overlayGuides, validateOverlayLayout} from "../settings/overlay-layout"
import {OverlayPlaybackService} from "./overlay-playback.service"
import {OverlayAssetsService} from "../assets/overlay-assets.service"

function hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex")
}

function sceneInput(input: unknown): Record<string, unknown> {
    if (!input || typeof input !== "object" || Array.isArray(input))
        throw new BadRequestException("Ungültige Szenen-Einstellungen.")
    return input as Record<string, unknown>
}

function sceneName(value: unknown): string {
    if (typeof value !== "string" || value.trim().length < 1 || value.trim().length > 80)
        throw new BadRequestException("Der Szenenname muss 1 bis 80 Zeichen enthalten.")
    return value.trim()
}

@Injectable()
export class OverlayService {
    private readonly logger: ModuleLogger

    constructor(
        private readonly repository: OverlayRepository,
        private readonly twitchAuth: TwitchAuthRepository,
        private readonly playback: OverlayPlaybackService,
        logger: BotLoggerService,
        private readonly assets: OverlayAssetsService
    ) {
        this.logger = logger.forModule("Overlay")
    }

    async scenes(guildId: string): Promise<GuildOverlay[]> {
        return (await this.repository.findScenes(guildId)).map((overlay) => this.toDashboard(overlay))
    }

    async scene(guildId: string, overlayId: string): Promise<GuildOverlay> {
        return this.toDashboard(await this.requireScene(guildId, overlayId))
    }

    async createScene(guildId: string, input: unknown): Promise<OverlayLink & {overlay: GuildOverlay}> {
        const data = sceneInput(input)
        const name = sceneName(data.name)
        const scene = data.scene === undefined ? "intermission" : data.scene
        if (!["intermission", "starting_soon", "stream_ending", "widgets"].includes(scene as string))
            throw new BadRequestException("Unbekannte Overlay-Szene.")
        const token = randomBytes(32).toString("base64url")
        const layout = overlayPreset(scene as OverlayScene, [randomUUID(), randomUUID()])
        const overlay = await this.repository.createScene(guildId, name, hashToken(token), layout)
        if (!overlay) throw new ConflictException("Maximal 20 Szenen pro Server sind erlaubt.")
        this.logger.info(`Overlay scene created guild=${guildId} overlay=${overlay.id} scene=${scene}`)
        return {overlay: this.toDashboard(overlay), browserSourceUrl: this.browserSourceUrl(token)}
    }

    async saveScene(guildId: string, overlayId: string, input: unknown): Promise<GuildOverlay> {
        await this.requireScene(guildId, overlayId)
        const layout = validateOverlayLayout(input)
        const saved = await this.repository.saveLayout(guildId, overlayId, layout)
        if (!saved)
            throw new BadRequestException(
                "Das gewählte Medium gehört nicht zu diesem Server, wurde gelöscht oder hat den falschen Typ."
            )
        this.logger.info(
            `Overlay scene layout saved guild=${guildId} overlay=${overlayId} widgets=${saved.widgets.length}`
        )
        return this.toDashboard(saved)
    }

    async rotateScene(guildId: string, overlayId: string): Promise<OverlayLink> {
        await this.requireScene(guildId, overlayId)
        const token = randomBytes(32).toString("base64url")
        await this.repository.rotateToken(guildId, overlayId, hashToken(token))
        this.logger.info(`Overlay scene URL rotated guild=${guildId} overlay=${overlayId}`)
        return {browserSourceUrl: this.browserSourceUrl(token)}
    }

    async renameScene(guildId: string, overlayId: string, input: unknown): Promise<GuildOverlay> {
        const name = sceneName(sceneInput(input).name)
        await this.requireScene(guildId, overlayId)
        const renamed = await this.repository.renameScene(guildId, overlayId, name)
        this.logger.info(`Overlay scene renamed guild=${guildId} overlay=${overlayId}`)
        return this.toDashboard(renamed)
    }

    async chat(guildId: string): Promise<OverlayChat> {
        const auth = await this.twitchAuth.findIdentityByGuildId(guildId)
        if (!auth) return {channel: null, url: null}
        return {channel: auth.username, url: twitchChatUrl(auth.username)}
    }

    async live(authorization: string | undefined): Promise<OverlaySnapshot> {
        const token = authorization?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1]
        if (!token) throw new UnauthorizedException("Ungültige oder fehlende Overlay-URL.")
        const overlay = await this.repository.findByTokenHash(hashToken(token))
        if (!overlay) throw new UnauthorizedException("Diese Overlay-URL ist nicht mehr gültig.")
        const dashboardOverlay = this.toDashboard(overlay)
        const [playback, chat, assets] = await Promise.all([
            this.playback.get(overlay.guildId),
            this.chat(overlay.guildId),
            this.assets.referenced(overlay.guildId, dashboardOverlay.layout, overlay)
        ])
        // Rotation can happen while Spotify is responding; recheck before publishing.
        if (!(await this.repository.findByTokenHash(hashToken(token))))
            throw new UnauthorizedException("Diese Overlay-URL ist nicht mehr gültig.")
        return {overlay: dashboardOverlay, playback, chat, assets}
    }

    private async requireScene(guildId: string, overlayId: string): Promise<StoredOverlay> {
        const overlay = await this.repository.findScene(guildId, overlayId)
        if (!overlay) throw new NotFoundException("Diese Overlay-Szene wurde nicht gefunden.")
        return overlay
    }

    private toDashboard(overlay: StoredOverlay): GuildOverlay {
        const settings = overlay.settings as Record<string, unknown> | null
        const theme =
            typeof settings?.theme === "string" && Object.hasOwn(OVERLAY_THEME_COLORS, settings.theme)
                ? (settings.theme as OverlayTheme)
                : "dark"
        const scene = ["intermission", "starting_soon", "stream_ending"].includes(settings?.scene as string)
            ? (settings!.scene as OverlayScene)
            : "widgets"
        const socialSettings =
            settings?.socials && typeof settings.socials === "object" && !Array.isArray(settings.socials)
                ? (settings.socials as Record<string, unknown>)
                : {}
        const socials: {twitch?: string; twitter?: string; discord?: string} = {}
        for (const key of ["twitch", "twitter", "discord"] as const)
            if (typeof socialSettings[key] === "string") socials[key] = socialSettings[key].slice(0, 100)
        return {
            id: overlay.id,
            guildId: overlay.guildId,
            name: overlay.name,
            layout: {
                width: OVERLAY_WIDTH,
                height: OVERLAY_HEIGHT,
                theme,
                scene,
                font: settings?.font === "jersey10" ? "jersey10" : "tiny5",
                socials,
                guides: overlayGuides(settings?.guides),
                widgets: overlay.widgets.map((widget) => this.toEditorWidget(widget))
            }
        }
    }

    private toEditorWidget(widget: OverlayWidgetRecord): EditorWidget {
        const geometry = {
            id: widget.id,
            x: widget.x,
            y: widget.y,
            width: widget.width,
            height: widget.height,
            zIndex: widget.zIndex
        }
        const storedParams = widget.params as Record<string, unknown> | null
        const appearance = {
            color: typeof storedParams?.color === "string" ? storedParams.color : "#ffffff",
            backgroundColor:
                typeof storedParams?.backgroundColor === "string" ? storedParams.backgroundColor : "#18181b"
        }
        switch (widget.type) {
            case "WINDOW": {
                const params = storedParams as Partial<WindowWidgetParams> | null
                return {
                    ...geometry,
                    type: "WINDOW",
                    params: {
                        ...appearance,
                        title: params?.title ?? "Fenster",
                        lockContentAspectRatio: params?.lockContentAspectRatio === true,
                        greenScreen: params?.greenScreen === true
                    }
                }
            }
            case "SPOTIFY_NOW_PLAYING": {
                const params = storedParams as Partial<SpotifyWidgetParams> | null
                return {
                    ...geometry,
                    type: "SPOTIFY_NOW_PLAYING",
                    params: {
                        ...appearance,
                        spectralizer: params?.spectralizer === true,
                        spectrumMode: params?.spectrumMode === "simulated" ? "simulated" : "audio",
                        audioDeviceName: params?.audioDeviceName ?? ""
                    }
                }
            }
            case "TWITCH_CHAT": {
                const params = storedParams as Partial<ChatWidgetParams> | null
                return {
                    ...geometry,
                    type: "TWITCH_CHAT",
                    params: {...appearance, ...TWITCH_CHAT_DEFAULTS, ...params}
                }
            }
            case "IMAGE":
            case "VIDEO": {
                const params = storedParams as Partial<MediaWidgetParams> | null
                return {
                    ...geometry,
                    type: widget.type,
                    params: {
                        ...appearance,
                        assetId: params?.assetId ?? "",
                        fit: params?.fit === "cover" ? "cover" : "contain"
                    }
                }
            }
        }
    }

    private browserSourceUrl(token: string): string {
        // Fragments never reach access logs or referrers.
        return `${frontendUrl()}/overlay#${token}`
    }
}
