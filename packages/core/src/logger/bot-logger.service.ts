import {Injectable, LoggerService} from "@nestjs/common"
import {mkdirSync} from "node:fs"
import {resolve} from "node:path"
import * as winston from "winston"
import {errorDetails} from "./error-details"

@Injectable()
export class BotLoggerService implements LoggerService {
    private readonly logger: winston.Logger

    constructor() {
        const level = process.env.LOG_LEVEL?.trim() || "info"
        if (!Object.hasOwn(winston.config.npm.levels, level)) {
            throw new Error("LOG_LEVEL must be a Winston level such as error, warn, info or debug.")
        }
        const transports: winston.transport[] = [new winston.transports.Console()]
        if (process.env.NODE_ENV !== "production") {
            const directory = resolve(__dirname, "../../../../logs")
            mkdirSync(directory, {recursive: true})
            transports.push(
                new winston.transports.File({
                    filename: resolve(directory, "combined.log"),
                    maxsize: 5 * 1024 * 1024,
                    maxFiles: 3
                })
            )
        }
        this.logger = winston.createLogger({
            level,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.printf(
                    ({timestamp, module, level, message}) => `${timestamp} [${module}] [${level}]: ${message}`
                )
            ),
            transports
        })
    }

    log(message: string, module?: string) {
        this.write("info", message, module)
    }

    error(message: unknown, traceOrContext?: string, module?: string) {
        const isTrace = traceOrContext?.includes("\n") || traceOrContext?.trimStart().startsWith("at ")
        const context = module ?? (isTrace ? "App" : traceOrContext) ?? "App"
        if (message instanceof Error) {
            this.write("error", `Unhandled exception ${errorDetails(message)}`, context)
            return
        }
        if (isTrace) {
            // Nest may pass the raw exception message separately from its stack.
            const error = new Error()
            error.stack = traceOrContext
            this.write("error", `Unhandled exception ${errorDetails(error)}`, context)
            return
        }
        this.write("error", typeof message === "string" ? message : "Unhandled exception error_type=unknown", context)
    }

    warn(message: string, module?: string) {
        this.write("warn", message, module)
    }

    debug?(message: string, module?: string) {
        this.write("debug", message, module)
    }

    verbose?(message: string, module?: string) {
        this.write("verbose", message, module)
    }

    info(message: string, module?: string) {
        this.write("info", message, module)
    }

    forModule(module: string): ModuleLogger {
        return {
            info: (message) => this.info(message, module),
            warn: (message) => this.warn(message, module),
            error: (message) => this.error(message, module),
            debug: (message) => this.debug?.(message, module)
        }
    }

    private write(level: string, message: string, module = "App"): void {
        this.logger.log({level, message, module})
    }
}

export interface ModuleLogger {
    info: (msg: string) => void
    error: (msg: string) => void
    warn: (msg: string) => void
    debug: (msg: string) => void
}
