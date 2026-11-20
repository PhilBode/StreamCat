import type {ImgHTMLAttributes} from "react"

type ImageSrc = string | {src: string}

type ImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "width" | "height"> & {
    src: ImageSrc
    width?: number | string
    height?: number | string
    unoptimized?: boolean
    priority?: boolean
    fill?: boolean
}

export default function Image({
    src,
    width: _width,
    height: _height,
    unoptimized: _unoptimized,
    priority: _priority,
    fill: _fill,
    ...props
}: ImageProps) {
    const value = typeof src === "string" ? src : src.src
    if (value.startsWith("/api/backend/")) {
        const label = value.includes("/twitch/") ? "T" : value.includes("/spotify/") ? "S" : "?"
        return (
            <span className="profile-avatar placeholder" aria-hidden="true">
                {label}
            </span>
        )
    }
    return <img src={value} alt={props.alt ?? ""} {...props} />
}
