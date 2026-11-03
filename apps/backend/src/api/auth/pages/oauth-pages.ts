import {readFileSync} from "node:fs"
import {join} from "node:path"

const STYLE = readFileSync(join(__dirname, "oauth-pages.css"), "utf8")
const ERROR_TEMPLATE = readFileSync(join(__dirname, "error-page.html"), "utf8")
const SUCCESS_TEMPLATE = readFileSync(join(__dirname, "success-page.html"), "utf8")

function escapeHtml(str: string): string {
    return str.replace(/&/g, "&amp").replace(/</g, "&lt").replace(/>/g, "&gt").replace(/"/g, "&quot")
}

function render(template: string, vars: Record<string, string>): string {
    const style = STYLE
    let html = template.replace("[style]", style)
    for (const [key, value] of Object.entries(vars)) {
        html = html.replaceAll(`{{${key}}}`, escapeHtml(value))
    }
    return html
}

export function errorPage(label: string, reason: string): string {
    return render(ERROR_TEMPLATE, {label, reason})
}

export function successPage(label: string): string {
    return render(SUCCESS_TEMPLATE, {label})
}
