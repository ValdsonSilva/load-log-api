import express from "express";
import cors from "cors";
import helmet from "helmet";
import { logger } from "./lib/logger.js";
import { routes } from "./routes.js";
import { errorMiddleware } from "./middlewares/error.js";
import PinoHttp from "pino-http";

export function buildApp() {
  const app = express();

  const allowedOrigins = ["*", "https://www.thunderclient.com"];
  const corsOptions: cors.CorsOptions = {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  };

  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(express.json({ limit: "10mb" }));
  app.use(PinoHttp({ logger: logger.logger }));

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use(routes);
  app.use(errorMiddleware);

  return app;
}
