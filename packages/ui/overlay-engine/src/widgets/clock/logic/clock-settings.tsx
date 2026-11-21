import type {ClockDateStyle, EditorWidget} from "@streamcat/interfaces"
import type {WidgetSettingsProps} from "../../types"
import {Select} from "../../../ui/dialog"

const FALLBACK_TIME_ZONES = [
    "UTC",
    "Europe/Berlin",
    "Europe/London",
    "Europe/Paris",
    "Europe/Moscow",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Sao_Paulo",
    "Asia/Dubai",
    "Asia/Kolkata",
    "Asia/Shanghai",
    "Asia/Tokyo",
    "Asia/Seoul",
    "Australia/Sydney",
    "Pacific/Auckland"
]

function timeZoneOptions() {
    const intl = Intl as typeof Intl & {supportedValuesOf?: (key: "timeZone") => string[]}
    const supported = intl.supportedValuesOf?.("timeZone") ?? FALLBACK_TIME_ZONES
    const zones = supported.includes("UTC") ? supported : ["UTC", ...supported]
    return [{value: "", label: "System"}, ...zones.map((zone) => ({value: zone, label: zone.replaceAll("_", " ")}))]
}

const TIME_ZONE_OPTIONS = timeZoneOptions()

const DATE_STYLE_OPTIONS: {value: ClockDateStyle; label: string}[] = [
    {value: "dmy-dot", label: "TT.MM.JJJJ"},
    {value: "dmy-slash", label: "TT/MM/JJJJ"},
    {value: "mdy-slash", label: "MM/TT/JJJJ"},
    {value: "ymd-dash", label: "JJJJ-MM-TT"}
]

export function ClockSettings({widget: value, onChange}: WidgetSettingsProps) {
    const widget = value as Extract<EditorWidget, {type: "CLOCK"}>
    return (
        <>
            <Select
                label="Zeitzone"
                value={widget.params.timeZone}
                options={TIME_ZONE_OPTIONS}
                searchable
                onChange={(timeZone) => onChange({...widget, params: {...widget.params, timeZone}})}
            />
            <Select
                label="Datumsformat"
                value={widget.params.dateStyle}
                options={DATE_STYLE_OPTIONS}
                onChange={(dateStyle) =>
                    onChange({...widget, params: {...widget.params, dateStyle: dateStyle as ClockDateStyle}})
                }
            />
            <label className="overlay-check">
                <input
                    type="checkbox"
                    className="overlay-check-input"
                    checked={widget.params.hour12}
                    onChange={(event) =>
                        onChange({...widget, params: {...widget.params, hour12: event.target.checked}})
                    }
                />
                <span className="overlay-check-box" aria-hidden="true" />
                12-Stunden-Format
            </label>
            <label className="overlay-check">
                <input
                    type="checkbox"
                    className="overlay-check-input"
                    checked={widget.params.showSeconds}
                    onChange={(event) =>
                        onChange({...widget, params: {...widget.params, showSeconds: event.target.checked}})
                    }
                />
                <span className="overlay-check-box" aria-hidden="true" />
                Sekunden anzeigen
            </label>
            <label className="overlay-check">
                <input
                    type="checkbox"
                    className="overlay-check-input"
                    checked={widget.params.showDate}
                    onChange={(event) =>
                        onChange({...widget, params: {...widget.params, showDate: event.target.checked}})
                    }
                />
                <span className="overlay-check-box" aria-hidden="true" />
                Datum anzeigen
            </label>
        </>
    )
}
