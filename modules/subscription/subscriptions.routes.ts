import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { getMySubscription } from "./subscriptions.controller.js";

export const subscriptionsRoutes = Router();
subscriptionsRoutes.use(requireAuth);

subscriptionsRoutes.get("/me/subscription", getMySubscription);
