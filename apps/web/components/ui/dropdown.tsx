"use client"

import {useEffect, useId, useRef, useState} from "react"
import {ChevronIcon} from "../icons"
import "./dropdown.css"

export type DropdownOption = {value: string; label: string}

type DropdownProps = {
    label?: string
    labelPosition?: "above" | "left"
    helper?: string
    value: string | null
    options: DropdownOption[]
    onChange: (value: string) => void
    disabled?: boolean
    error?: boolean
    placeholder?: string
}

export function Dropdown({
    label,
    labelPosition = "above",
    helper,
    value,
    options,
    onChange,
    disabled,
    error,
    placeholder
}: DropdownProps) {
    const [open, setOpen] = useState(false)
    const rootRef = useRef<HTMLDivElement>(null)
    const listId = useId()

    const selected = options.find((option) => option.value === value) ?? null

    useEffect(() => {
        if (!open) return
        function onPointerDown(event: PointerEvent) {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
        }
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") setOpen(false)
        }
        document.addEventListener("pointerdown", onPointerDown)
        document.addEventListener("keydown", onKeyDown)
        return () => {
            document.removeEventListener("pointerdown", onPointerDown)
            document.removeEventListener("keydown", onKeyDown)
        }
    }, [open])

    return (
        <div
            className={["dropdown", labelPosition === "left" ? "dropdown--left" : "", error ? "dropdown--error" : ""]
                .filter(Boolean)
                .join(" ")}
        >
            {label && <span className="dropdown-label">{label}</span>}
            <div className="dropdown-root" ref={rootRef}>
                <button
                    type="button"
                    className="dropdown-field"
                    aria-haspopup="listbox"
                    aria-expanded={open}
                    aria-controls={listId}
                    disabled={disabled}
                    onClick={() => setOpen((current) => !current)}
                >
                    <span
                        style={{
                            flex: 1,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            textAlign: "left"
                        }}
                    >
                        {selected ? selected.label : (placeholder ?? "")}
                    </span>
                    <ChevronIcon className="dropdown-chevron" direction={open ? "up" : "down"} />
                </button>
                {open && (
                    <ul className="dropdown-list" role="listbox" id={listId}>
                        {options.map((option) => (
                            <li key={option.value}>
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={option.value === value}
                                    className="dropdown-option"
                                    onClick={() => {
                                        setOpen(false)
                                        onChange(option.value)
                                    }}
                                >
                                    {option.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            {helper && <p className="dropdown-helper">{helper}</p>}
        </div>
    )
}
