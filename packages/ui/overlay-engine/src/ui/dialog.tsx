"use client"

import {useEffect, useRef, useState, type ReactNode, type RefObject} from "react"
import {createPortal} from "react-dom"

export function useFloatingMenuRect(
    open: boolean,
    fieldRef: RefObject<HTMLElement | null>,
    close: () => void
): {
    rootRef: RefObject<HTMLDivElement | null>
    menuRef: RefObject<HTMLUListElement | null>
    rect: {top: number; left: number; width: number; above: boolean} | null
} {
    const rootRef = useRef<HTMLDivElement>(null)
    const menuRef = useRef<HTMLUListElement>(null)
    const [rect, setRect] = useState<{top: number; left: number; width: number; above: boolean} | null>(null)

    function updateRect() {
        const el = fieldRef.current
        if (!el) return
        const box = el.getBoundingClientRect()
        const below = window.innerHeight - box.bottom
        const above = below < 248 && box.top > 248
        setRect({
            top: above ? box.top - 8 : box.bottom + 4,
            left: box.left,
            width: box.width,
            above
        })
    }

    useEffect(() => {
        if (!open) return
        updateRect()
        function onPointerDown(event: PointerEvent) {
            if (rootRef.current?.contains(event.target as Node)) return
            if (menuRef.current?.contains(event.target as Node)) return
            close()
        }
        function onKeyDown(event: KeyboardEvent) {
            if (event.key !== "Escape") return

            event.stopPropagation()
            close()
        }
        function onLayout() {
            updateRect()
        }
        document.addEventListener("pointerdown", onPointerDown)
        document.addEventListener("keydown", onKeyDown, true)
        document.addEventListener("scroll", onLayout, true)
        window.addEventListener("resize", onLayout)

        const observer = new ResizeObserver(onLayout)
        if (rootRef.current) observer.observe(rootRef.current)
        document.fonts?.ready.then(onLayout).catch(() => {})
        return () => {
            document.removeEventListener("pointerdown", onPointerDown)
            document.removeEventListener("keydown", onKeyDown, true)
            document.removeEventListener("scroll", onLayout, true)
            window.removeEventListener("resize", onLayout)
            observer.disconnect()
        }
    }, [open])

    return {rootRef, menuRef, rect}
}

export function Dialog({
    title,
    subtitle,
    closeLabel = "Schließen",
    onClose,
    footer,
    width,
    children
}: {
    title: ReactNode
    subtitle?: ReactNode
    closeLabel?: string
    onClose?: () => void
    footer?: ReactNode
    width?: number
    children: ReactNode
}) {
    useEffect(() => {
        if (!onClose) return
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") onClose?.()
        }
        document.addEventListener("keydown", onKeyDown)
        return () => document.removeEventListener("keydown", onKeyDown)
    }, [onClose])

    return (
        <div
            className="overlay-dialog-backdrop"
            onPointerDown={(event) => event.target === event.currentTarget && onClose?.()}
        >
            <div
                className="overlay-dialog"
                role="dialog"
                aria-modal="true"
                style={width ? {maxWidth: width} : undefined}
            >
                <div className="overlay-dialog-header">
                    <div className="overlay-dialog-header-row">
                        <h2 className="overlay-dialog-title">{title}</h2>
                        {onClose && (
                            <button
                                type="button"
                                className="overlay-icon-button overlay-icon-button--sm"
                                aria-label={closeLabel}
                                onClick={onClose}
                            >
                                <DialogCloseGlyph />
                            </button>
                        )}
                    </div>
                    {subtitle && <p className="overlay-dialog-subtitle">{subtitle}</p>}
                </div>
                <div className="overlay-dialog-rule" aria-hidden="true" />
                <div className="overlay-dialog-content">{children}</div>
                {footer && (
                    <>
                        <div className="overlay-dialog-rule" aria-hidden="true" />
                        <div className="overlay-dialog-footer">{footer}</div>
                    </>
                )}
            </div>
        </div>
    )
}

function DialogCloseGlyph() {
    return (
        <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M4.9948 3.93414L8.00001 6.93935L11.0052 3.93414L12.0659 4.9948L9.06067 8.00001L12.0659 11.0052L11.0052 12.0659L8.00001 9.06067L4.9948 12.0659L3.93414 11.0052L6.93935 8.00001L3.93414 4.9948L4.9948 3.93414Z"
                fill="currentColor"
            />
        </svg>
    )
}

export function EditorTab({active, children, onClick}: {active: boolean; children: ReactNode; onClick: () => void}) {
    return (
        <button type="button" className={`overlay-tab ${active ? "overlay-tab--active" : ""}`} onClick={onClick}>
            {active && (
                <span className="overlay-tab-prefix" aria-hidden="true">
                    &gt;
                </span>
            )}
            {children}
            {active && <span className="overlay-tab-indicator" aria-hidden="true" />}
        </button>
    )
}

export function EditorIconButton({
    label,
    icon,
    variant = "secondary",
    small,
    disabled,
    onClick
}: {
    label: string
    icon: ReactNode
    variant?: "primary" | "secondary" | "danger"
    small?: boolean
    disabled?: boolean
    onClick?: () => void
}) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            disabled={disabled}
            className={`overlay-icon-button overlay-icon-button--${variant} ${small ? "overlay-icon-button--sm" : ""}`}
            onClick={onClick}
        >
            {icon}
        </button>
    )
}

export function ChevronGlyph({direction}: {direction: "up" | "down"}) {
    return (
        <svg
            aria-hidden="true"
            width="8"
            height="5"
            viewBox="0 0 8 5"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{transform: direction === "down" ? "rotate(180deg)" : undefined}}
        >
            <path d="M0.75 4.25L4 0.75L7.25 4.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
        </svg>
    )
}

export type SelectOption = {value: string; label: string}

export function Select({
    label,
    value,
    options,
    onChange,
    disabled,
    placeholder,
    inline
}: {
    label?: string
    value: string | null
    options: SelectOption[]
    onChange: (value: string) => void
    disabled?: boolean
    placeholder?: string
    inline?: boolean
}) {
    const [open, setOpen] = useState(false)
    const fieldRef = useRef<HTMLButtonElement>(null)
    const {rootRef, menuRef, rect} = useFloatingMenuRect(open, fieldRef, () => setOpen(false))
    const selected = options.find((option) => option.value === value) ?? null

    return (
        <div className={`overlay-select ${inline ? "overlay-select--inline" : ""}`}>
            {label && <span className="overlay-select-label">{label}</span>}
            <div className="overlay-select-root" ref={rootRef}>
                <button
                    ref={fieldRef}
                    type="button"
                    className="overlay-select-field"
                    aria-haspopup="listbox"
                    aria-expanded={open}
                    disabled={disabled}
                    onClick={() => setOpen((current) => !current)}
                >
                    <span className="overlay-select-value">{selected ? selected.label : (placeholder ?? "")}</span>
                    <span className="overlay-select-chevron">
                        <ChevronGlyph direction={open ? "up" : "down"} />
                    </span>
                </button>
                {open &&
                    rect &&
                    createPortal(
                        <ul
                            ref={menuRef}
                            className="overlay-select-list overlay-select-list--floating"
                            role="listbox"
                            style={{
                                left: rect.left,
                                width: rect.width,
                                ...(rect.above ? {bottom: window.innerHeight - rect.top} : {top: rect.top})
                            }}
                        >
                            {options.map((option) => (
                                <li key={option.value}>
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected={option.value === value}
                                        className="overlay-select-option"
                                        onClick={() => {
                                            setOpen(false)
                                            onChange(option.value)
                                        }}
                                    >
                                        {option.label}
                                    </button>
                                </li>
                            ))}
                        </ul>,
                        document.body
                    )}
            </div>
        </div>
    )
}

export function SidebarSection({
    label,
    summary,
    defaultOpen,
    children
}: {
    label: ReactNode
    summary?: ReactNode
    defaultOpen?: boolean
    children: ReactNode
}) {
    const [open, setOpen] = useState(!!defaultOpen)
    return (
        <div className="overlay-section">
            <button type="button" className="overlay-section-row" aria-expanded={open} onClick={() => setOpen(!open)}>
                <span>{label}</span>
                <span className="overlay-section-chevron">
                    <ChevronGlyph direction={open ? "up" : "down"} />
                </span>
            </button>
            {open ? (
                <div className="overlay-section-content">{children}</div>
            ) : (
                summary != null && <p className="overlay-section-summary">{summary}</p>
            )}
        </div>
    )
}

export function Section({
    label,
    defaultOpen,
    children
}: {
    label: ReactNode
    defaultOpen?: boolean
    children: ReactNode
}) {
    const [open, setOpen] = useState(!!defaultOpen)
    return (
        <div className="overlay-section">
            <button type="button" className="overlay-section-row" aria-expanded={open} onClick={() => setOpen(!open)}>
                <span>{label}</span>
                <span className="overlay-section-chevron">
                    <ChevronGlyph direction={open ? "up" : "down"} />
                </span>
            </button>
            {open && <div className="overlay-section-content">{children}</div>}
        </div>
    )
}
