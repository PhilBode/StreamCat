import type {SVGProps} from "react"

type IconProps = SVGProps<SVGSVGElement>

function Base({children, ...props}: IconProps) {
    return (
        <svg
            aria-hidden="true"
            focusable="false"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            {...props}
        >
            {children}
        </svg>
    )
}

export function PlusIcon(props: IconProps) {
    return (
        <Base {...props}>
            <path d="M8.75 3V7.25H13V8.75H8.75V13H7.25V8.75H3V7.25H7.25V3H8.75Z" fill="currentColor" />
        </Base>
    )
}

export function CloseIcon(props: IconProps) {
    return (
        <Base {...props}>
            <path
                d="M4.9948 3.93414L8.00001 6.93935L11.0052 3.93414L12.0659 4.9948L9.06067 8.00001L12.0659 11.0052L11.0052 12.0659L8.00001 9.06067L4.9948 12.0659L3.93414 11.0052L6.93935 8.00001L3.93414 4.9948L4.9948 3.93414Z"
                fill="currentColor"
            />
        </Base>
    )
}

export function UndoIcon(props: IconProps) {
    return (
        <Base {...props}>
            <path
                d="M12.75 9.5C12.75 8.77065 12.4601 8.07139 11.9443 7.55566C11.4286 7.03994 10.7293 6.75 10 6.75H3.25V5.25H10C11.1272 5.25 12.2079 5.69809 13.0049 6.49512C13.8019 7.29215 14.25 8.37283 14.25 9.5C14.25 10.6272 13.8019 11.7079 13.0049 12.5049C12.2079 13.3019 11.1272 13.75 10 13.75H5.25V12.25H10C10.7293 12.25 11.4286 11.9601 11.9443 11.4443C12.4601 10.9286 12.75 10.2293 12.75 9.5Z"
                fill="currentColor"
            />
            <path d="M7.56055 3L4.56055 6L7.56055 9L6.5 10.0605L2.43945 6L6.5 1.93945L7.56055 3Z" fill="currentColor" />
        </Base>
    )
}

export function RedoIcon(props: IconProps) {
    return (
        <Base {...props}>
            <path
                d="M3.93945 9.5C3.93945 8.77065 4.22939 8.07139 4.74512 7.55566C5.26084 7.03994 5.96011 6.75 6.68945 6.75H13.4395V5.25H6.68945C5.56228 5.25 4.4816 5.69809 3.68457 6.49512C2.88754 7.29215 2.43945 8.37283 2.43945 9.5C2.43945 10.6272 2.88754 11.7079 3.68457 12.5049C4.4816 13.3019 5.56228 13.75 6.68945 13.75H11.4395V12.25H6.68945C5.96011 12.25 5.26084 11.9601 4.74512 11.4443C4.22939 10.9286 3.93945 10.2293 3.93945 9.5Z"
                fill="currentColor"
            />
            <path
                d="M9.12891 3L12.1289 6L9.12891 9L10.1895 10.0605L14.25 6L10.1895 1.93945L9.12891 3Z"
                fill="currentColor"
            />
        </Base>
    )
}

export function PenIcon(props: IconProps) {
    return (
        <Base {...props}>
            <path
                d="M2.59998 13.4L3.59998 10.2L10.7 3.09999C11.1 2.69999 11.8 2.69999 12.2 3.09999C12.6 3.49999 12.6 4.19999 12.2 4.59999L5.09998 11.7L2.59998 13.4Z"
                fill="currentColor"
            />
        </Base>
    )
}

export function TrashIcon(props: IconProps) {
    return (
        <Base {...props}>
            <path d="M3.5 4H12.5V5.4H3.5V4Z" fill="currentColor" />
            <path d="M6.40002 2.39999H9.60002V3.59999H6.40002V2.39999Z" fill="currentColor" />
            <path d="M4.70001 6H11.3L10.7 13.4H5.30001L4.70001 6Z" fill="currentColor" />
        </Base>
    )
}

export function ChevronIcon({direction = "down", ...props}: IconProps & {direction?: "up" | "down"}) {
    return (
        <svg
            aria-hidden="true"
            focusable="false"
            width="8"
            height="5"
            viewBox="0 0 8 5"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{transform: direction === "down" ? "rotate(180deg)" : undefined}}
            {...props}
        >
            <path d="M0.75 4.25L4 0.75L7.25 4.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
        </svg>
    )
}
