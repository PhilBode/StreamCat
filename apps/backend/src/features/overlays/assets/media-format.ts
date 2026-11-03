import {BadRequestException} from "@nestjs/common"

export const MAX_ASSET_BYTES = 100 * 1024 * 1024
export const GUILD_ASSET_QUOTA_BYTES = 500n * 1024n * 1024n

export function mediaFormat(
    header: Buffer,
    size: number,
    claimed: string
): {kind: "IMAGE" | "VIDEO"; mimeType: string} {
    let mimeType: string | undefined
    if (header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && size >= 24)
        mimeType = "image/png"
    else if (header[0] === 255 && header[1] === 216 && header[2] === 255 && size >= 4) mimeType = "image/jpeg"
    else if (["GIF87a", "GIF89a"].includes(header.subarray(0, 6).toString("ascii")) && size >= 13)
        mimeType = "image/gif"
    else if (
        header.subarray(0, 4).toString("ascii") === "RIFF" &&
        header.subarray(8, 12).toString("ascii") === "WEBP" &&
        size >= 16
    )
        mimeType = "image/webp"
    else if (
        header.subarray(4, 8).toString("ascii") === "ftyp" &&
        header.length >= 16 &&
        header.readUInt32BE(0) >= 16 &&
        header.readUInt32BE(0) <= size
    )
        mimeType = "video/mp4"
    else if (header.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163])) && header.includes(Buffer.from("webm")))
        mimeType = "video/webm"
    if (!mimeType || (claimed !== mimeType && claimed !== "application/octet-stream")) {
        throw new BadRequestException(
            "Erlaubt sind PNG, JPEG, WebP, GIF, MP4 und WebM. Dateityp und Inhalt müssen übereinstimmen."
        )
    }
    return {kind: mimeType.startsWith("image/") ? "IMAGE" : "VIDEO", mimeType}
}
