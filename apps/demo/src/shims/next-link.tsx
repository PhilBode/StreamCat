import type {AnchorHTMLAttributes, ReactNode} from "react"

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    href: string | URL
    children?: ReactNode
    prefetch?: boolean
    replace?: boolean
    scroll?: boolean
    shallow?: boolean
    passHref?: boolean
    legacyBehavior?: boolean
}

export default function Link({
    href,
    children,
    prefetch: _prefetch,
    replace: _replace,
    scroll: _scroll,
    shallow: _shallow,
    passHref: _passHref,
    legacyBehavior: _legacyBehavior,
    ...props
}: LinkProps) {
    return (
        <a href={typeof href === "string" ? href : href.toString()} {...props}>
            {children}
        </a>
    )
}
