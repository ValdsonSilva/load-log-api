import app from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";

const server = app.listen(env.PORT, () => {
  logger.logger.info({ port: env.PORT }, "server up");
});

server.requestTimeout = 120_000;
server.headersTimeout = 125_000;
server.keepAliveTimeout = 120_000;