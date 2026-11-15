import {resolve} from "node:path"
import {frontendUrl} from "@streamcat/core/config"
import type {NextConfig} from "next"
import {backendUrl as backend} from "./lib/backend"

const config: NextConfig = {
    output: "standalone",
    outputFileTracingRoot: resolve(__dirname, "../.."),
    transpilePackages: ["@streamcat/overlay-engine"],
    experimental: {proxyClientMaxBodySize: "100mb", proxyTimeout: 120000},
    logging: {incomingRequests: {ignore: [/^\/api\/backend\/overlays\/assets\//]}},
    allowedDevOrigins: [new URL(frontendUrl()).hostname, "localhost", "127.0.0.1"],
    async headers() {
        const development = process.env.NODE_ENV !== "production"
        const policy = [
            "default-src 'self'",
            "base-uri 'self'",
            "object-src 'none'",
            "frame-ancestors 'none'",
            "form-action 'self'",
            "frame-src https://chat.johnnycyan.com",
            "img-src 'self' data: blob: https:",
            "media-src 'self' blob:",
            "font-src 'self'",
            "style-src 'self' 'unsafe-inline'",
            `script-src 'self' 'unsafe-inline'${development ? " 'unsafe-eval'" : ""}`,
            `connect-src 'self'${development ? " ws: wss:" : ""}`
        ].join("; ")
        return [
            {
                source: "/:path*",
                headers: [
                    {key: "Content-Security-Policy", value: policy},
                    {key: "X-Frame-Options", value: "DENY"},
                    {key: "X-Content-Type-Options", value: "nosniff"},
                    {key: "Referrer-Policy", value: "no-referrer"}
                ]
            }
        ]
    },
    async rewrites() {
        // Local media handlers run first; other API and callback requests reach the bot.
        return {
            fallback: [
                {source: "/api/backend/:path*", destination: `${backend}/:path*`},
                {source: "/callback/:provider", destination: `${backend}/callback/:provider`},
                {source: "/eventsub/:path*", destination: `${backend}/eventsub/:path*`},
                {source: "/event/:path*", destination: `${backend}/eventsub/event/:path*`}
            ]
        }
    }
}

export default config
