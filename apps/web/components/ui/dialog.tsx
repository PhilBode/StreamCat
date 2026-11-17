import {useEffect, type ReactNode} from "react"
import {CloseIcon} from "../icons"
import {IconButton} from "./button"
import "./dialog.css"

type DialogProps = {
    title: ReactNode
    subtitle?: ReactNode
    closeLabel?: string
    onClose?: () => void
    footer?: ReactNode
    children: ReactNode
}

export function Dialog({title, subtitle, closeLabel = "Schließen", onClose, footer, children}: DialogProps) {
    useEffect(() => {
        if (!onClose) return
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") onClose?.()
        }
        document.addEventListener("keydown", onKeyDown)
        return () => document.removeEventListener("keydown", onKeyDown)
    }, [onClose])

    return (
        <div className="dialog-backdrop" onPointerDown={(event) => event.target === event.currentTarget && onClose?.()}>
            <div className="dialog" role="dialog" aria-modal="true">
                <div className="dialog-header">
                    <div className="dialog-header-row">
                        <h2 className="dialog-title">{title}</h2>
                        {onClose && (
                            <IconButton
                                typeVariant="secondary"
                                size="sm"
                                label={closeLabel}
                                icon={<CloseIcon />}
                                onClick={onClose}
                            />
                        )}
                    </div>
                    {subtitle && <p className="dialog-subtitle">{subtitle}</p>}
                </div>
                <div className="dialog-rule" aria-hidden="true" />
                <div className="dialog-content">{children}</div>
                {footer && (
                    <>
                        <div className="dialog-rule" aria-hidden="true" />
                        <div className="dialog-footer">{footer}</div>
                    </>
                )}
            </div>
        </div>
    )
}
