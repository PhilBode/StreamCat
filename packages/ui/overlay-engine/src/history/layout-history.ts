import type {OverlayLayout} from "@streamcat/interfaces"

export type LayoutUpdate = OverlayLayout | null | ((current: OverlayLayout | null) => OverlayLayout | null)
export type EditGroup = "pointer" | "field" | "keyboard"
export type LayoutHistory = {
    past: OverlayLayout[]
    present: OverlayLayout | null
    future: OverlayLayout[]
    group: {before: OverlayLayout; kind: EditGroup} | null
}
export type HistoryAction =
    | {type: "change" | "replace"; update: LayoutUpdate}
    | {type: "reset"; layout: OverlayLayout | null}
    | {type: "begin"; kind: EditGroup}
    | {type: "end" | "undo" | "redo"}

export const EMPTY_HISTORY: LayoutHistory = {past: [], present: null, future: [], group: null}
const LIMIT = 100
const equal = (a: OverlayLayout | null, b: OverlayLayout | null) => a === b || JSON.stringify(a) === JSON.stringify(b)
const append = (past: OverlayLayout[], layout: OverlayLayout) => [...past, layout].slice(-LIMIT)

export function groupChanged(state: LayoutHistory): boolean {
    return !!state.group && !equal(state.group.before, state.present)
}

function finishGroup(state: LayoutHistory): LayoutHistory {
    if (!state.group) return state
    if (!groupChanged(state)) return {...state, group: null}
    return {...state, past: append(state.past, state.group.before), future: [], group: null}
}

export function layoutHistory(state: LayoutHistory, action: HistoryAction): LayoutHistory {
    switch (action.type) {
        case "reset":
            return {...EMPTY_HISTORY, present: action.layout}
        case "begin": {
            const previous = finishGroup(state)
            return previous.present ? {...previous, group: {before: previous.present, kind: action.kind}} : previous
        }
        case "end":
            return finishGroup(state)
        case "change": {
            const next = typeof action.update === "function" ? action.update(state.present) : action.update
            if (equal(next, state.present)) return state
            if (!next) return EMPTY_HISTORY
            if (state.group) return {...state, present: next}
            return {
                past: state.present ? append(state.past, state.present) : [],
                present: next,
                future: [],
                group: null
            }
        }
        case "replace": {
            // Server normalization after saving is not a separate user edit.
            const next = typeof action.update === "function" ? action.update(state.present) : action.update
            if (equal(next, state.present)) return state
            if (!next) return EMPTY_HISTORY
            const group =
                state.group && equal(state.group.before, state.present) ? {...state.group, before: next} : state.group
            return {...state, present: next, group}
        }
        case "undo": {
            if (state.group && state.group.kind !== "field") return state
            const previous = finishGroup(state)
            const last = previous.past.at(-1)
            if (!last || !previous.present) return previous
            return {
                past: previous.past.slice(0, -1),
                present: last,
                future: [previous.present, ...previous.future],
                group: null
            }
        }
        case "redo": {
            if (state.group && state.group.kind !== "field") return state
            const previous = finishGroup(state)
            const next = previous.future[0]
            if (!next || !previous.present) return previous
            return {
                past: append(previous.past, previous.present),
                present: next,
                future: previous.future.slice(1),
                group: null
            }
        }
    }
}
