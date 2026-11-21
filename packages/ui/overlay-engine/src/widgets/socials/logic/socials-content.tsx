import type {EditorWidget, OverlayChat} from "@streamcat/interfaces"
import "../designs/socials-base.css"
import {SocialIcon} from "./socials-icons"

type SocialsWidget = Extract<EditorWidget, {type: "SOCIALS"}>

export function SocialsContent({
    widget,
    chat,
    variant
}: {
    widget: SocialsWidget
    chat: OverlayChat
    variant: "inline" | "icons"
}) {
    const params = widget.params
    const handles = {
        twitch: params.twitch || (chat.channel ? `/${chat.channel}` : ""),
        twitter: params.twitter,
        discord: params.discord
    }
    const showLabels = variant === "inline" && params.showLabels
    return (
        <div className={`overlay-socials overlay-socials--${params.direction} overlay-socials--${variant}`}>
            {(["twitch", "twitter", "discord"] as const).map(
                (provider) =>
                    handles[provider] && (
                        <span key={provider} className={`overlay-socials-link overlay-socials-${provider}`}>
                            {params.showIcons && <SocialIcon provider={provider} />}
                            {showLabels && <span className="overlay-socials-label">{handles[provider]}</span>}
                        </span>
                    )
            )}
        </div>
    )
}
