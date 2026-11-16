import type {ButtonHTMLAttributes, ReactNode} from "react"
import "./tab.css"

type TabProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    active?: boolean
    children: ReactNode
}

export function Tab({active, children, className, ...props}: TabProps) {
    return (
        <button
            type="button"
            className={["tab", active ? "tab--active" : "", className].filter(Boolean).join(" ")}
            {...props}
        >
            {active && (
                <span className="tab-prefix" aria-hidden="true">
                    &gt;
                </span>
            )}
            {children}
            {active && <span className="tab-indicator" aria-hidden="true" />}
        </button>
    )
}
