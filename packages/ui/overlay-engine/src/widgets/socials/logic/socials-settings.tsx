import type {EditorWidget} from "@streamcat/interfaces"
import type {WidgetSettingsProps} from "../../types"
import {Select} from "../../../ui/dialog"

export function SocialsSettings({widget: value, onChange}: WidgetSettingsProps) {
    const widget = value as Extract<EditorWidget, {type: "SOCIALS"}>
    return (
        <>
            {(["twitch", "twitter", "discord"] as const).map((provider) => (
                <label key={provider} className="overlay-field">
                    <span className="overlay-field-label">
                        {{twitch: "Twitch", twitter: "Twitter", discord: "Discord"}[provider]}
                    </span>
                    <input
                        className="overlay-field-input"
                        maxLength={100}
                        value={widget.params[provider]}
                        placeholder={provider === "twitch" ? "Kanal" : provider === "twitter" ? "@name" : "Einladung"}
                        onChange={(event) =>
                            onChange({...widget, params: {...widget.params, [provider]: event.target.value}})
                        }
                    />
                </label>
            ))}
            <Select
                label="Anordnung"
                value={widget.params.direction}
                options={[
                    {value: "row", label: "Nebeneinander"},
                    {value: "column", label: "Untereinander"}
                ]}
                onChange={(value) =>
                    onChange({
                        ...widget,
                        params: {...widget.params, direction: value as "row" | "column"}
                    })
                }
            />
            {widget.params.design !== "icons" && (
                <label className="overlay-check">
                    <input
                        type="checkbox"
                        className="overlay-check-input"
                        checked={widget.params.showLabels}
                        onChange={(event) =>
                            onChange({...widget, params: {...widget.params, showLabels: event.target.checked}})
                        }
                    />
                    <span className="overlay-check-box" aria-hidden="true" />
                    Namen anzeigen
                </label>
            )}
            <label className="overlay-check">
                <input
                    type="checkbox"
                    className="overlay-check-input"
                    checked={widget.params.showIcons}
                    onChange={(event) =>
                        onChange({...widget, params: {...widget.params, showIcons: event.target.checked}})
                    }
                />
                <span className="overlay-check-box" aria-hidden="true" />
                Symbole anzeigen
            </label>
        </>
    )
}
