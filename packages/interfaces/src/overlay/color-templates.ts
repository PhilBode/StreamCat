export type OverlayColorTemplate = {
    label: string
    color: string
    backgroundColor: string
    gradientStart: string
    gradientEnd: string
    tokens?: Record<`--${string}`, string>
}

export const OVERLAY_COLOR_TEMPLATES = {
    standard: {
        label: "Standard",
        color: "#ffffff",
        backgroundColor: "#1b191ca1",
        gradientStart: "#8a71b3",
        gradientEnd: "#e88a98",
        tokens: {"--window-bg": "#1b191c", "--progress-color": "#1db954"}
    },
    autumn: {
        label: "Herbst",
        color: "#f6aa1c",
        backgroundColor: "#62170854",
        gradientStart: "#e07a2f",
        gradientEnd: "#6b1d2f",
        tokens: {"--window-bg": "#220901", "--progress-color": "#941b0c"}
    },
    winter: {
        label: "Winter",
        color: "#d3d2c6",
        backgroundColor: "#6d6d695e",
        gradientStart: "#2c3e50",
        gradientEnd: "#7fb3d8",
        tokens: {"--window-bg": "#494d4a", "--progress-color": "#7a879a"}
    }
} as const satisfies Record<string, OverlayColorTemplate>
