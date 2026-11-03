import js from "@eslint/js"
import {defineConfig, globalIgnores} from "eslint/config"
import tseslint from "typescript-eslint"

export default defineConfig([
    globalIgnores([
        "**/node_modules/**",
        "**/.next/**",
        "**/dist/**",
        "**/prisma/generated/**",
        "**/*.d.ts",
        "apps/web/**"
    ]),
    {
        files: ["**/*.{js,mjs,ts}"],
        extends: [js.configs.recommended, tseslint.configs.recommended],
        rules: {
            "@typescript-eslint/no-unused-vars": [
                "error",
                {argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_", ignoreRestSiblings: true}
            ]
        }
    },
    // SDK test doubles also model private state.
    {files: ["**/tests/**/*.ts"], rules: {"@typescript-eslint/no-explicit-any": "off"}}
])
