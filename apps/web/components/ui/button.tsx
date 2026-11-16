import type {AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode} from "react"
import "./button.css"

export type ButtonType = "primary" | "secondary" | "danger"

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    typeVariant?: ButtonType
    icon?: ReactNode
    children: ReactNode
}

export function Button({typeVariant = "primary", icon, children, className, ...props}: ButtonProps) {
    return (
        <button className={["button", `button--${typeVariant}`, className].filter(Boolean).join(" ")} {...props}>
            {icon}
            {children}
        </button>
    )
}

export function ButtonLink({
    typeVariant = "primary",
    icon,
    children,
    className,
    ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {typeVariant?: ButtonType; icon?: ReactNode; children: ReactNode}) {
    return (
        <a className={["button", `button--${typeVariant}`, className].filter(Boolean).join(" ")} {...props}>
            {icon}
            {children}
        </a>
    )
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    typeVariant?: ButtonType
    size?: "md" | "sm"
    label: string
    icon: ReactNode
}

export function IconButton({
    typeVariant = "secondary",
    size = "md",
    label,
    icon,
    className,
    ...props
}: IconButtonProps) {
    return (
        <button
            aria-label={label}
            title={label}
            className={["icon-button", `icon-button--${typeVariant}`, size === "sm" ? "icon-button--sm" : "", className]
                .filter(Boolean)
                .join(" ")}
            {...props}
        >
            {icon}
        </button>
    )
}
