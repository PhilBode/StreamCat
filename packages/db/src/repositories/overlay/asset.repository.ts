import type {AssetRecord} from "../../models/overlay/asset"
import {Injectable} from "@nestjs/common"
import {PrismaService} from "../../prisma.service"

import type {CreateAssetInput} from "../../dto/overlay/create-asset-input"
import type {AssetDeletionResult} from "../../models/overlay/asset-deletion-result"

@Injectable()
export class AssetRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findStorageKeys(): Promise<string[]> {
        const assets = await this.prisma.asset.findMany({select: {storageKey: true}})
        return assets.map((asset) => asset.storageKey)
    }

    findByIdAndGuildId(assetId: string, guildId: string): Promise<AssetRecord | null> {
        return this.prisma.asset.findFirst({where: {id: assetId, guildId}})
    }

    findManyByGuildId(guildId: string): Promise<AssetRecord[]> {
        return this.prisma.asset.findMany({where: {guildId}, orderBy: [{createdAt: "desc"}, {id: "asc"}]})
    }

    async storageUsageBytes(guildId: string): Promise<bigint> {
        const usage = await this.prisma.asset.aggregate({where: {guildId}, _sum: {sizeBytes: true}})
        return usage._sum.sizeBytes ?? 0n
    }

    findReferenced(guildId: string, assetIds: string[]): Promise<AssetRecord[]> {
        return this.prisma.asset.findMany({where: {guildId, id: {in: assetIds}}})
    }

    createWithinQuota(asset: CreateAssetInput, maxStorageBytes: bigint): Promise<AssetRecord | null> {
        return this.prisma.$transaction(async (transaction) => {
            // Uploads for the same guild must check the quota one at a time.
            await transaction.$queryRaw`
                SELECT "guildId" FROM "GuildConfig"
                WHERE "guildId" = ${asset.guildId} FOR UPDATE
            `

            const storageUsage = await transaction.asset.aggregate({
                where: {guildId: asset.guildId},
                _sum: {sizeBytes: true}
            })
            const usedStorageBytes = storageUsage._sum.sizeBytes ?? 0n
            const uploadSizeBytes = asset.sizeBytes ?? 0n

            if (usedStorageBytes + uploadSizeBytes > maxStorageBytes) {
                return null
            }

            return transaction.asset.create({data: asset})
        })
    }

    deleteIfUnused(guildId: string, assetId: string): Promise<AssetDeletionResult> {
        return this.prisma.$transaction(async (transaction) => {
            // Layout saves take the same lock so JSON references cannot race deletion.
            await transaction.$queryRaw`
                SELECT "guildId" FROM "GuildConfig"
                WHERE "guildId" = ${guildId} FOR UPDATE
            `

            const asset = await transaction.asset.findFirst({where: {id: assetId, guildId}})
            if (!asset) {
                return {status: "not-found"}
            }

            const referenceCount = await transaction.overlay.count({
                where: {
                    guildId,
                    OR: [
                        {backgroundAssetId: assetId},
                        {
                            widgets: {
                                some: {
                                    type: {in: ["IMAGE", "VIDEO"]},
                                    params: {path: ["assetId"], equals: assetId}
                                }
                            }
                        }
                    ]
                }
            })
            if (referenceCount > 0) {
                return {status: "in-use"}
            }

            await transaction.asset.delete({where: {id: assetId, guildId}})
            return {status: "deleted", asset}
        })
    }
}
