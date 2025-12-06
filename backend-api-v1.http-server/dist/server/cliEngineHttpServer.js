/**
 * cliEngineHttpServer.ts
 *
 * CLI entry point for the Backend API v1 HTTP server.
 */
import { createEngineHttpServer } from "./engineHttpServer.js";
import { loadAllCoursesFromDir } from "../invariants/index.js";
import { createDefaultStudentPolicy } from "../stepmaster/index.js";
function getPortFromEnv() {
    const raw = process.env.ENGINE_HTTP_PORT ?? process.env.PORT ?? "4201";
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return 4201;
    }
    return parsed;
}
function makeHandlerDeps() {
    const log = (message) => {
        // eslint-disable-next-line no-console
        console.log(message);
    };
    // 1. Load Invariants
    // We scan the config/courses directory for all JSON files.
    const registry = loadAllCoursesFromDir({
        path: "config/courses",
    });
    // 2. Create Policy
    const policy = createDefaultStudentPolicy();
    const deps = {
        invariantRegistry: registry,
        policy,
        log,
        logger,
    };
    return deps;
}
import { logger } from "../logger.js";
import { authService } from "../auth/auth.service.js";
import { SessionService } from "../session/session.service.js";
export async function main() {
    const port = getPortFromEnv();
    try {
        // Initialize Persistency Services
        await authService.init();
        await SessionService.init();
        const handlerDeps = makeHandlerDeps();
        const server = createEngineHttpServer({
            port,
            handlerDeps,
            log: (message) => {
                logger.info(message);
            },
        });
        await server.start();
    }
    catch (error) {
        logger.error({ err: error }, "Failed to start server");
        process.exit(1);
    }
}
// Execute immediately when run via `node --import tsx` or `pnpm tsx`.
// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();
