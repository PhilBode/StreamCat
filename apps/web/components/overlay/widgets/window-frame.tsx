import type {CSSProperties, ReactNode} from "react"
import {WINDOW_HEADER_HEIGHT, WINDOW_CONTENT_BORDER, WINDOW_CORNER_RADIUS} from "@streamcat/interfaces"

const geometry = {
    "--window-header-height": `${WINDOW_HEADER_HEIGHT}px`,
    "--window-content-border": `${WINDOW_CONTENT_BORDER}px`,
    "--window-corner-radius": `${WINDOW_CORNER_RADIUS}px`
} as CSSProperties

export function WindowFrame({
    title,
    children,
    greenScreen = false
}: {
    title: string
    children?: ReactNode
    greenScreen?: boolean
}) {
    return (
        <div className="overlay-window" style={geometry}>
            <div className="overlay-window-header">
                <span>{title}</span>
                <div className="overlay-window-controls" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                </div>
            </div>
            <div className="overlay-window-content" style={greenScreen ? {backgroundColor: "#00ff00"} : undefined}>
                {children}
            </div>
        </div>
    )
}
