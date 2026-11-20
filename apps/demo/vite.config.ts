import {fileURLToPath} from "node:url"
import {defineConfig} from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
    base: "./",
    plugins: [react()],
    resolve: {
        alias: {
            "next/link": fileURLToPath(new URL("./src/shims/next-link.tsx", import.meta.url)),
            "next/image": fileURLToPath(new URL("./src/shims/next-image.tsx", import.meta.url))
        }
    },
    build: {
        outDir: "dist",
        emptyOutDir: true,
        assetsInlineLimit: 0
    }
})
