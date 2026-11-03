import {defineConfig} from "prisma/config"
import {databaseUrl} from "@streamcat/core"

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations"
    },
    datasource: {
        url: databaseUrl()
    }
})
