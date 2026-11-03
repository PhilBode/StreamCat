"use client"

import Image from "next/image"
import {useState} from "react"
import {Skeleton} from "../ui/skeleton"

export function ProfileAvatar({src, name}: {src?: string | null; name: string}) {
    const [loadedSource, setLoadedSource] = useState<string | null>(null)
    const [failedSource, setFailedSource] = useState<string | null>(null)

    if (!src || src === failedSource) {
        return (
            <span className="profile-avatar placeholder" aria-hidden="true">
                {name.trim().slice(0, 1).toUpperCase() || "?"}
            </span>
        )
    }

    return (
        <span className="profile-avatar-frame">
            {loadedSource !== src && <Skeleton className="skeleton-avatar" />}
            <Image
                unoptimized
                className={`profile-avatar${loadedSource !== src ? " profile-avatar-loading" : ""}`}
                src={src}
                alt=""
                width={48}
                height={48}
                onLoad={() => setLoadedSource(src)}
                onError={() => setFailedSource(src)}
            />
        </span>
    )
}
