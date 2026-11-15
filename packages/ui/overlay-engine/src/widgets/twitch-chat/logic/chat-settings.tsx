import {TWITCH_CHAT_DEFAULTS, type EditorWidget} from "@streamcat/interfaces"
import type {WidgetSettingsProps} from "../../types"
import {ChatFontField} from "./chat-font-field"

export function ChatSettings({widget: value, onChange}: WidgetSettingsProps) {
    const widget = value as Extract<EditorWidget, {type: "TWITCH_CHAT"}>
    return (
        <>
            <label className="overlay-theme-control">
                Twitch-Kanal
                <input
                    value={widget.params.chatChannel ?? ""}
                    maxLength={25}
                    placeholder="z. B. twitch"
                    onChange={(event) =>
                        onChange({...widget, params: {...widget.params, chatChannel: event.target.value.toLowerCase()}})
                    }
                />
            </label>
            <p className="muted overlay-hint">
                Leer = verknüpfter Twitch-Kanal. Für einen anderen Chat brauchst du keine zusätzliche Anmeldung.
            </p>
            <details className="overlay-chat-options">
                <summary>Chat-Darstellung</summary>
                <ChatFontField
                    key={widget.id}
                    value={widget.params.chatFont}
                    onChange={(chatFont) => onChange({...widget, params: {...widget.params, chatFont}})}
                />
                <label className="overlay-theme-control">
                    Textgröße
                    <select
                        value={widget.params.chatSize ?? TWITCH_CHAT_DEFAULTS.chatSize}
                        onChange={(event) =>
                            onChange({...widget, params: {...widget.params, chatSize: Number(event.target.value)}})
                        }
                    >
                        {["Winzig", "Klein", "Mittel", "Groß"].map((size, index) => (
                            <option key={size} value={index}>
                                {size}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="overlay-theme-control">
                    Nachrichten ausblenden nach (Sekunden)
                    <input
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
                <p className="muted overlay-hint">0 = Nachrichten bleiben sichtbar.</p>
                {(["chatAnimate", "chatBots", "chatHideCommands", "chatHideBadges"] as const).map((field) => (
                    <label className="overlay-checkbox" key={field}>
                        <input
                            type="checkbox"
                            checked={widget.params[field] ?? TWITCH_CHAT_DEFAULTS[field]}
                            onChange={(event) =>
                                onChange({...widget, params: {...widget.params, [field]: event.target.checked}})
                            }
                        />
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
            </details>
        </>
    )
}
