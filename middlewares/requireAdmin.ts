import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/error.js";

export const requireAdmin: RequestHandler = async (req, _res, next) => {
    const userId = req.auth?.userId;

    if (!userId) {
        throw new AppError(401, "Unauthorized");
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            role: true,
            isActive: true,
        },
    });

    if (!user || !user.isActive) {
        throw new AppError(401, "Unauthorized");
    }

    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
        throw new AppError(403, "Forbidden: admin access required");
    }

    next();
};

export const requireSuperAdmin: RequestHandler = async (req, _res, next) => {
    const userId = req.auth?.userId;

    if (!userId) {
        throw new AppError(401, "Unauthorized");
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            role: true,
            isActive: true,
        },
    });

    if (!user || !user.isActive) {
        throw new AppError(401, "Unauthorized");
    }

    if (user.role !== "SUPER_ADMIN") {
        throw new AppError(403, "Forbidden: super admin access required");
    }

    next();
};