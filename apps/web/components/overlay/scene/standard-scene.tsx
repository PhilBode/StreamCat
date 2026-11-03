"use client"

import {useEffect, useState} from "react"
import type {OverlayChat, OverlayLayout, OverlayScene} from "@streamcat/interfaces"

function SocialIcon({provider}: {provider: "twitch" | "twitter" | "discord"}) {
    const paths = {
        twitch: "M3 2 1 6v14h5v3h3l3-3h4l7-7V2H3Zm18 10-4 4h-5l-3 3v-3H5V4h16v8ZM15 6h2v6h-2V6Zm-5 0h2v6h-2V6Z",
        twitter:
            "M23 4.5a9 9 0 0 1-2.6.7 4.5 4.5 0 0 0 2-2.5 9 9 0 0 1-2.9 1.1 4.5 4.5 0 0 0-7.7 4.1A12.8 12.8 0 0 1 2.5 3.2a4.5 4.5 0 0 0 1.4 6 4.5 4.5 0 0 1-2-.6 4.5 4.5 0 0 0 3.6 4.5 4.5 4.5 0 0 1-2 .1 4.5 4.5 0 0 0 4.2 3.1A9 9 0 0 1 1 18.2a12.8 12.8 0 0 0 19.7-10.8v-.6A9 9 0 0 0 23 4.5Z",
        discord:
            "M20.3 4.6a19.6 19.6 0 0 0-4.8-1.5l-.6 1.3a18.3 18.3 0 0 0-5.8 0l-.6-1.3a19.7 19.7 0 0 0-4.8 1.5C.7 9 .0 13.4.4 17.7a19.7 19.7 0 0 0 6 3l1.2-2a12.7 12.7 0 0 1-1.9-.9l.5-.4a14.6 14.6 0 0 0 11.6 0l.5.4-1.9.9 1.2 2a19.7 19.7 0 0 0 6-3c.5-5-1-9.3-3.3-13.1ZM8 15.3c-1.1 0-2-1-2-2.3s.9-2.3 2-2.3 2 1 2 2.3-.9 2.3-2 2.3Zm8 0c-1.1 0-2-1-2-2.3s.9-2.3 2-2.3 2 1 2 2.3-.9 2.3-2 2.3Z"
    }
    return (
        <svg viewBox="0 0 24 24" className="overlay-social-icon" aria-hidden="true">
            <path fill="currentColor" d={paths[provider]} />
        </svg>
    )
}

export function StandardScene({
    scene,
    chat,
    socials
}: {
    scene: OverlayScene
    chat: OverlayChat
    socials?: OverlayLayout["socials"]
}) {
    const [clock, setClock] = useState({time: "", date: ""})
    useEffect(() => {
        if (scene === "widgets") return
        function update() {
            const now = new Date()
            setClock({time: now.toLocaleTimeString("de-DE"), date: now.toLocaleDateString("de-DE")})
        }
        update()
        const timer = setInterval(update, 1000)
        return () => clearInterval(timer)
    }, [scene])

    if (scene === "widgets") return null
    const handles = {
        twitch: socials?.twitch || (chat.channel ? `/${chat.channel}` : ""),
        twitter: socials?.twitter,
        discord: socials?.discord
    }
    return (
        <>
            <div className="overlay-scene-background">
                <div className="overlay-gradient" />
            </div>
            {scene !== "intermission" && (
                <div className="overlay-scene-title">
                    {scene === "starting_soon" ? "STARTING SOON" : "STREAM ENDING"}
                    <span>.</span>
                    <span>.</span>
                    <span>.</span>
                </div>
            )}
            <div className="overlay-taskbar">
                <div className="overlay-social-links">
                    {(["twitch", "twitter", "discord"] as const).map(
                        (provider) =>
                            handles[provider] && (
                                <span key={provider} className={`overlay-social-link overlay-social-${provider}`}>
                                    <SocialIcon provider={provider} />
                                    {handles[provider]}
                                </span>
                            )
                    )}
                </div>
                <div className="overlay-clock">
                    <span>{clock.time}</span>
                    <span>{clock.date}</span>
                </div>
            </div>
        </>
    )
}
