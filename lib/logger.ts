import PinoHttp from "pino-http";

export const logger = PinoHttp.pinoHttp({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
});
