import {useId, type InputHTMLAttributes, type ReactNode} from "react"
import "./text-input.css"

type TextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
    label?: ReactNode
    helper?: ReactNode
    secret?: boolean
}

export function TextInput({label, helper, secret, className, id: idProp, ...props}: TextInputProps) {
    const autoId = useId()
    const id = idProp ?? autoId
    const error = props["aria-invalid"] || undefined
    return (
        <div
            className={["text-input", secret ? "text-input--secret" : "", error ? "text-input--error" : "", className]
                .filter(Boolean)
                .join(" ")}
        >
            {label && (
                <label className="text-input-label" htmlFor={id}>
                    {label}
                </label>
            )}
            <div className="text-input-field">
                <input
                    id={id}
                    className="text-input-input"
                    type={secret ? "password" : (props.type ?? "text")}
                    {...props}
                />
            </div>
            {helper && <p className="text-input-helper">{helper}</p>}
        </div>
    )
}
