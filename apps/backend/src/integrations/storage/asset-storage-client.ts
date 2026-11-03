import {S3Client} from "bun"
import {requireEnv} from "@streamcat/core"

export function assetStorageClient(): S3Client {
    return new S3Client({
        accessKeyId: requireEnv("S3_ACCESS_KEY_ID"),
        secretAccessKey: requireEnv("S3_SECRET_ACCESS_KEY"),
        endpoint: process.env.S3_ENDPOINT || "http://127.0.0.1:3900",
        bucket: "overlay-assets",
        region: "garage"
    })
}
