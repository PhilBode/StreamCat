import type {ReactNode} from "react"
import "./status-pill.css"

export type StatusPillState = "connected" | "neutral" | "online" | "error" | "offline"

export function StatusPill({state, children}: {state: StatusPillState; children?: ReactNode}) {
    const fallback: Record<StatusPillState, string> = {
        connected: "Verknüpft",
        neutral: "Offen",
        online: "Online",
        error: "Error",
        offline: "Offline"
    }
    return (
        <span className={`status-pill status-pill--${state}`}>
            <span className="status-pill-dot" aria-hidden="true" />
            {children ?? fallback[state]}
        </span>
    )
}
