import { Router } from "express";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { loadsRoutes } from "./modules/loads/loads.routes.js";
import { attachmentsRoutes } from "./modules/attachments/attachments.routes.js";
import { disputesRoutes } from "./modules/disputes/disputes..routes.js";
import { invitationsRoutes } from "./modules/invitation/invitation.routes.js";
import { subscriptionsRoutes } from "./modules/subscription/subscriptions.routes.js";
import { exportsRoutes } from "./modules/exports/exports.routes.js";
import { timelineRoutes } from "./modules/timeline/timeline.routes.js";
import { stopsRoutes } from "./modules/stops/stops.routes.js";
import { acessorialsRoutes } from "./modules/acessorials/accessorials.routes.js";

export const routes = Router();

routes.use("/auth", authRoutes);
routes.use("/loads", loadsRoutes);
routes.use("/", [
    disputesRoutes,
    invitationsRoutes,
    subscriptionsRoutes,
    attachmentsRoutes,
    exportsRoutes,
    timelineRoutes,
    stopsRoutes,
    acessorialsRoutes
]);

