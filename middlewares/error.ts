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

// import type { ErrorRequestHandler } from "express";
// import { ZodError } from "zod";
// import { AppError } from "../utils/error.js";

// export const errorMiddleware: ErrorRequestHandler = (err, _req, res, _next) => {
//     console.error("ERROR MIDDLEWARE:", {
//         name: err?.name,
//         message: err?.message,
//         stack: err?.stack,
//         details: err?.details,
//     });

//     if (err instanceof AppError) {
//         return res.status(err.statusCode).json({
//             error: err.message,
//             details: err.details ?? null,
//         });
//     }

//     if (err instanceof ZodError) {
//         return res.status(400).json({
//             error: "Validation error",
//             details: err.issues,
//         });
//     }

//     return res.status(500).json({
//         error: err?.message || "Internal server error",
//     });
// };