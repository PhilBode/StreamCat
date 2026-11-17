"use client"

import Image from "next/image"
import {useState} from "react"
import "./profile-avatar.css"

export function ProfileAvatar({src, name}: {src?: string | null; name: string}) {
    const [failed, setFailed] = useState(false)

    if (!src || failed) {
        return (
            <span className="profile-avatar placeholder" aria-hidden="true">
                {name.trim().slice(0, 1).toUpperCase() || "?"}
            </span>
        )
    }

    return (
        <span className="profile-avatar-frame">
            <Image
                unoptimized
                className="profile-avatar"
                src={src}
                alt=""
                width={48}
                height={48}
                onError={() => setFailed(true)}
            />
        </span>
    )
}
