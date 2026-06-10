import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import {
    acceptDriverInvite,
    cancelConnection,
    getDispatcherProfile,
    inviteDriver,
    listDispatcherConnections,
    listDriverInvites,
    rejectDriverInvite,
    revokeConnection,
    upsertDispatcherProfile,
} from "./dispatcher.controller.js";

export const dispatcherRoutes = Router();

dispatcherRoutes.use(requireAuth);

dispatcherRoutes.get("/profile", getDispatcherProfile);
dispatcherRoutes.post("/profile", upsertDispatcherProfile);
dispatcherRoutes.patch("/profile", upsertDispatcherProfile);

dispatcherRoutes.post("/connections/invite", inviteDriver);
dispatcherRoutes.get("/connections", listDispatcherConnections);
dispatcherRoutes.patch("/connections/:id/cancel", cancelConnection);
dispatcherRoutes.patch("/connections/:id/revoke", revokeConnection);

dispatcherRoutes.get("/driver-invites", listDriverInvites);
dispatcherRoutes.patch("/driver-invites/:id/accept", acceptDriverInvite);
dispatcherRoutes.patch("/driver-invites/:id/reject", rejectDriverInvite);