import {Injectable} from "@nestjs/common"
import {PrismaService} from "../../prisma.service"
import {isMediaWidget, type OverlayLayout} from "@streamcat/interfaces"
import type {StoredOverlay} from "../../models/overlay/stored-overlay"

const widgetsInLayerOrder = {widgets: {orderBy: [{zIndex: "asc" as const}, {id: "asc" as const}]}}
const MAX_SCENES_PER_GUILD = 20

@Injectable()
export class OverlayRepository {
    constructor(private readonly prisma: PrismaService) {}

    findByTokenHash(tokenHash: string): Promise<StoredOverlay | null> {
        return this.prisma.overlay.findUnique({where: {tokenHash}, include: widgetsInLayerOrder})
    }

    findById(sceneId: string): Promise<StoredOverlay | null> {
        return this.prisma.overlay.findUnique({where: {id: sceneId}, include: widgetsInLayerOrder})
    }

    findScenes(guildId: string): Promise<StoredOverlay[]> {
        return this.prisma.overlay.findMany({
            where: {guildId},
            orderBy: [{createdAt: "asc"}, {id: "asc"}],
            include: widgetsInLayerOrder
        })
    }

    findScene(guildId: string, sceneId: string): Promise<StoredOverlay | null> {
        return this.prisma.overlay.findUnique({where: {id: sceneId, guildId}, include: widgetsInLayerOrder})
    }

    async createScene(
        guildId: string,
        name: string,
        tokenHash: string,
        layout: OverlayLayout
    ): Promise<StoredOverlay | null> {
        return this.prisma.$transaction(async (transaction) => {
            // Concurrent requests must share this lock to enforce the scene limit.
            await transaction.$queryRaw`
                SELECT "guildId" FROM "GuildConfig"
                WHERE "guildId" = ${guildId} FOR UPDATE
            `

            const sceneCount = await transaction.overlay.count({where: {guildId}})
            if (sceneCount >= MAX_SCENES_PER_GUILD) {
                return null
            }

            return transaction.overlay.create({
                data: {
                    guildId,
                    name,
                    tokenHash,
                    settings: getLayoutSettings(layout),
                    widgets: {create: layout.widgets}
                },
                include: widgetsInLayerOrder
            })
        })
    }

    saveLayout(guildId: string, sceneId: string, layout: OverlayLayout): Promise<StoredOverlay | null> {
        return this.prisma.$transaction(async (transaction) => {
            // Asset deletion takes the same lock so a saved layout cannot reference a deleted file.
            await transaction.$queryRaw`
                SELECT "guildId" FROM "GuildConfig"
                WHERE "guildId" = ${guildId} FOR UPDATE
            `

            const mediaWidgets = layout.widgets.filter(isMediaWidget)
            if (mediaWidgets.length > 0) {
                const referencedAssets = await transaction.asset.findMany({
                    where: {guildId, id: {in: mediaWidgets.map((widget) => widget.params.assetId)}}
                })
                for (const widget of mediaWidgets) {
                    const asset = referencedAssets.find((asset) => asset.id === widget.params.assetId)
                    if (!asset || asset.kind !== widget.type) {
                        return null
                    }
                }
            }

            return transaction.overlay.update({
                where: {id: sceneId, guildId},
                data: {
                    settings: getLayoutSettings(layout),
                    widgets: {deleteMany: {}, create: layout.widgets}
                },
                include: widgetsInLayerOrder
            })
        })
    }

    async rotateToken(guildId: string, sceneId: string, tokenHash: string): Promise<void> {
        await this.prisma.overlay.update({where: {id: sceneId, guildId}, data: {tokenHash}})
    }

    renameScene(guildId: string, sceneId: string, name: string): Promise<StoredOverlay> {
        return this.prisma.overlay.update({where: {id: sceneId, guildId}, data: {name}, include: widgetsInLayerOrder})
    }
}

function getLayoutSettings(layout: OverlayLayout) {
    return {
        width: layout.width,
        height: layout.height,
        theme: layout.theme,
        scene: layout.scene ?? "widgets",
        font: layout.font ?? "tiny5",
        socials: layout.socials ?? {},
        guides: layout.guides ?? {vertical: [], horizontal: []}
    }
}
