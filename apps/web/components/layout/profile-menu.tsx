"use client"

import Link from "next/link"
import {useEffect, useRef, useState} from "react"
import {ProfileAvatar} from "../dashboard/profile-avatar"
import "./profile-menu.css"

export function ProfileMenu({name, avatarSrc}: {name: string; avatarSrc: string | null}) {
    const [open, setOpen] = useState(false)
    const rootRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open) return
        function onPointerDown(event: PointerEvent) {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
        }
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") setOpen(false)
        }
        document.addEventListener("pointerdown", onPointerDown)
        document.addEventListener("keydown", onKeyDown)
        return () => {
            document.removeEventListener("pointerdown", onPointerDown)
            document.removeEventListener("keydown", onKeyDown)
        }
    }, [open])

    return (
        <div className="profile-menu-root" ref={rootRef}>
            <button
                type="button"
                className="profile-menu-trigger"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen((value) => !value)}
            >
                <span className="profile-menu-name">{name}</span>
                <ProfileAvatar src={avatarSrc} name={name} />
            </button>
            {open && (
                <div className="profile-menu" role="menu" aria-label="Profilmenü">
                    <Link className="profile-menu-item profile-menu-item-server" role="menuitem" href="/dashboard">
                        Meine Server
                        <span className="profile-menu-item-arrow" aria-hidden="true">
                            ›
                        </span>
                    </Link>
                    <div className="profile-menu-divider" role="separator" />
                    <form action="/api/backend/dashboard/auth/logout" method="post">
                        <button className="profile-menu-item profile-menu-item-logout" role="menuitem" type="submit">
                            Abmelden
                        </button>
                    </form>
                </div>
            )}
        </div>
    )
}
