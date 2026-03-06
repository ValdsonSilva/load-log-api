import { z } from "zod";

export const RedeemInvitationSchema = z.object({
  code: z.string().min(4),
});
