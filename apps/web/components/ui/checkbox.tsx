import type {InputHTMLAttributes, ReactNode} from "react"
import "./checkbox.css"

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
    children?: ReactNode
}

export function Checkbox({children, className, ...props}: CheckboxProps) {
    return (
        <label
            className={["checkbox", props.disabled ? "checkbox--disabled" : "", className].filter(Boolean).join(" ")}
        >
            <input className="checkbox-input" type="checkbox" {...props} />
            <span className="checkbox-box" aria-hidden="true" />
            {children}
        </label>
    )
}
