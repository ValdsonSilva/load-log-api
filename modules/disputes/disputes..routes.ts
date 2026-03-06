import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import {
    addEvidence,
    createDispute,
    deleteDispute,
    getDispute,
    listDisputes,
    removeEvidence,
    updateDispute,
} from "./disputes.controller.js";

export const disputesRoutes = Router();
disputesRoutes.use(requireAuth);

disputesRoutes.post("/loads/:loadId/disputes", createDispute);
disputesRoutes.get("/loads/:loadId/disputes", listDisputes);

disputesRoutes.get("/disputes/:disputeId", getDispute);
disputesRoutes.patch("/disputes/:disputeId", updateDispute);
disputesRoutes.delete("/disputes/:disputeId", deleteDispute);

disputesRoutes.post("/disputes/:disputeId/evidences", addEvidence);
disputesRoutes.delete("/disputes/:disputeId/evidences/:attachmentId", removeEvidence);
