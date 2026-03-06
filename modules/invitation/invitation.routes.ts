import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { redeemInvitation } from "./invitations.controller.js";

export const invitationsRoutes = Router();
invitationsRoutes.use(requireAuth);

invitationsRoutes.post("/invitations/redeem", redeemInvitation);
