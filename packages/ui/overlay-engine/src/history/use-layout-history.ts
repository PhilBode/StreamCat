"use client"

import {useCallback, useEffect, useReducer, useRef} from "react"
import type {OverlayLayout} from "@streamcat/interfaces"
import {EMPTY_HISTORY, groupChanged, layoutHistory, type EditGroup, type LayoutUpdate} from "./layout-history"

export function isTextInput(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false
    if (target.closest("textarea, [contenteditable]")) return true
    return (
        target instanceof HTMLInputElement &&
        !["checkbox", "radio", "color", "range", "button", "submit", "reset", "file"].includes(target.type)
    )
}

export function isGroupedField(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false
    return isTextInput(target) || target.matches("select, input[type=color], input[type=range]")
}

export function useLayoutHistory(enabled: boolean, onNavigate?: () => void) {
    const [state, dispatch] = useReducer(layoutHistory, EMPTY_HISTORY)
    // Count edits synchronously so a pending save can detect even queued React updates.
    const revision = useRef(0)
    const getRevision = useCallback(() => revision.current, [])
    const interacting = !!state.group && state.group.kind !== "field"
    const canUndo = !interacting && (state.past.length > 0 || groupChanged(state))
    const canRedo = !interacting && state.future.length > 0 && !groupChanged(state)
    const setLayout = useCallback((update: LayoutUpdate) => {
        revision.current++
        dispatch({type: "change", update})
    }, [])
    const reset = useCallback((layout: OverlayLayout | null) => dispatch({type: "reset", layout}), [])
    const replace = useCallback((update: LayoutUpdate) => dispatch({type: "replace", update}), [])
    const begin = useCallback((kind: EditGroup) => dispatch({type: "begin", kind}), [])
    const end = useCallback(() => dispatch({type: "end"}), [])
    const undo = useCallback(() => {
        revision.current++
        dispatch({type: "undo"})
    }, [])
    const redo = useCallback(() => {
        revision.current++
        dispatch({type: "redo"})
    }, [])

    useEffect(() => {
        // Releasing a key outside the window must not leave an edit group open.
        window.addEventListener("blur", end)
        return () => window.removeEventListener("blur", end)
    }, [end])

    useEffect(() => {
        if (!enabled) return
        function keyDown(event: KeyboardEvent) {
            if (
                event.defaultPrevented ||
                event.altKey ||
                !(event.ctrlKey || event.metaKey) ||
                isTextInput(event.target)
            )
                return
            const key = event.key.toLowerCase()
            if (key !== "z" && key !== "y") return
            event.preventDefault()
            if (key === "y" || event.shiftKey) {
                if (canRedo) {
                    redo()
                    onNavigate?.()
                }
            } else if (canUndo) {
                undo()
                onNavigate?.()
            }
        }
        window.addEventListener("keydown", keyDown)
        return () => window.removeEventListener("keydown", keyDown)
    }, [enabled, canUndo, canRedo, undo, redo, onNavigate])

    return {layout: state.present, setLayout, reset, replace, begin, end, undo, redo, canUndo, canRedo, getRevision}
}
