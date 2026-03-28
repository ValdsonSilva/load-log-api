import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { createLoad, listLoads, getLoad, patchLoad, deleteLoad } from "./loads.controller.js";

export const loadsRoutes = Router();

// todas as rotas de loads exigem autenticação
loadsRoutes.use(requireAuth);

loadsRoutes.post("/", createLoad);
loadsRoutes.get("/", listLoads);
loadsRoutes.get("/:id", getLoad);
loadsRoutes.patch("/:id/status", patchLoad);
loadsRoutes.delete("/:id", deleteLoad);
