import PinoHttp from "pino-http";

export const logger = PinoHttp({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
});
