import type { RequestHandler } from "express";
import { AppError } from "../../utils/error.js";
import { RedeemInvitationSchema } from "./invitation.schema.js";
import { InvitationsService } from "./invitations.service.js";

const service = new InvitationsService();

export const redeemInvitation: RequestHandler = async (req, res) => {
  const userId = req.auth?.userId;
  if (!userId) throw new AppError(401, "Unauthorized");

  const { code } = RedeemInvitationSchema.parse(req.body);
  const sub = await service.redeem(userId, code);
  res.json(sub);
};
