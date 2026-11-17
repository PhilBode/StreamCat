import type {ReactNode} from "react"
import {ChevronIcon} from "../icons"
import "./accordion.css"

export function Accordion({
    label,
    children,
    defaultOpen
}: {
    label: ReactNode
    children: ReactNode
    defaultOpen?: boolean
}) {
    return (
        <details className="accordion" open={defaultOpen}>
            <summary className="accordion-summary">
                {label}
                <ChevronIcon className="accordion-chevron" direction="down" />
            </summary>
            <div className="accordion-content">{children}</div>
        </details>
    )
}
