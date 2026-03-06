import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { createLoadExport, listLoadExports } from "./exports.controller.js";

export const exportsRoutes = Router();
exportsRoutes.use(requireAuth);

exportsRoutes.post("/loads/:loadId/exports", createLoadExport);
exportsRoutes.get("/loads/:loadId/exports", listLoadExports);