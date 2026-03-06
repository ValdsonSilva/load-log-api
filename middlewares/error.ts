import type { ErrorRequestHandler } from "express";
import { AppError } from "../utils/error.js";

export const errorMiddleware: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            error: err.message,
            details: err.details ?? null,
        });
    }

    return res.status(500).json({ error: "Internal server error" });
};
