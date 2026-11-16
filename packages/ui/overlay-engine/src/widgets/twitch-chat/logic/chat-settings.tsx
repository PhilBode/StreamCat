import {TWITCH_CHAT_DEFAULTS, type EditorWidget} from "@streamcat/interfaces"
import type {WidgetSettingsProps} from "../../types"
import {ChatFontField} from "./chat-font-field"
import {Select} from "../../../ui/dialog"

export function ChatSettings({widget: value, onChange}: WidgetSettingsProps) {
    const widget = value as Extract<EditorWidget, {type: "TWITCH_CHAT"}>
    return (
        <>
            <label className="overlay-field">
                <span className="overlay-field-label">Twitch-Kanal</span>
                <input
                    className="overlay-field-input"
                    value={widget.params.chatChannel ?? ""}
                    maxLength={25}
                    placeholder="z. B. twitch"
                    onChange={(event) =>
                        onChange({...widget, params: {...widget.params, chatChannel: event.target.value.toLowerCase()}})
                    }
                />
            </label>
            <p className="overlay-settings-hint">
                Leer = verknüpfter Twitch-Kanal. Für einen anderen Chat brauchst du keine zusätzliche Anmeldung.
            </p>
            <ChatFontField
                key={widget.id}
                value={widget.params.chatFont}
                onChange={(chatFont) => onChange({...widget, params: {...widget.params, chatFont}})}
            />
            <Select
                label="Textgröße"
                value={String(widget.params.chatSize ?? TWITCH_CHAT_DEFAULTS.chatSize)}
                options={["Winzig", "Klein", "Mittel", "Groß"].map((size, index) => ({
                    value: String(index),
                    label: size
                }))}
                onChange={(value) => onChange({...widget, params: {...widget.params, chatSize: Number(value)}})}
            />
            <label className="overlay-field">
                <span className="overlay-field-label">Nachrichten ausblenden nach (Sekunden)</span>
                <input
                    className="overlay-field-input"
                    type="number"
                    min={0}
                    max={3600}
                    value={widget.params.chatFade ?? TWITCH_CHAT_DEFAULTS.chatFade}
                    onChange={(event) =>
                        onChange({
                            ...widget,
                            params: {
                                ...widget.params,
                                chatFade: Math.max(0, Math.min(3600, Number(event.target.value)))
                            }
                        })
                    }
                />
            </label>
            <p className="overlay-settings-hint">0 = Nachrichten bleiben sichtbar.</p>
            {(["chatAnimate", "chatBots", "chatHideCommands", "chatHideBadges"] as const).map((field) => (
                <label className="overlay-check" key={field}>
                    <input
                        type="checkbox"
                        className="overlay-check-input"
                        checked={widget.params[field] ?? TWITCH_CHAT_DEFAULTS[field]}
                        onChange={(event) =>
                            onChange({...widget, params: {...widget.params, [field]: event.target.checked}})
                        }
                    />
                    <span className="overlay-check-box" aria-hidden="true" />
                    {
                        {
                            chatAnimate: "Neue Nachrichten animieren",
                            chatBots: "Bots ausblenden",
                            chatHideCommands: "Commands ausblenden",
                            chatHideBadges: "Badges ausblenden"
                        }[field]
                    }
                </label>
            ))}
        </>
    )
}
