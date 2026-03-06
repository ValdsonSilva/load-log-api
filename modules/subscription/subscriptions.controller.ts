import type { RequestHandler } from "express";
import { AppError } from "../../utils/error.js";
import { SubscriptionsService } from "./subscriptions.service.js";

const service = new SubscriptionsService();

export const getMySubscription: RequestHandler = async (req, res) => {
    const userId = req.auth?.userId;
    if (!userId) throw new AppError(401, "Unauthorized");

    const sub = await service.getMySubscription(userId);
    res.json(sub ?? null);
};
