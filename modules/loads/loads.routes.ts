import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { createLoad, listLoads, getLoad, patchLoad, deleteLoad, processLocationPoint } from "./loads.controller.js";

export const loadsRoutes = Router();

// todas as rotas de loads exigem autenticação
loadsRoutes.use(requireAuth);

loadsRoutes.post("/", createLoad);
loadsRoutes.post("/logistics/location/:loadId", processLocationPoint);
loadsRoutes.get("/", listLoads);
loadsRoutes.get("/:id", getLoad);
loadsRoutes.patch("/:id", patchLoad);
loadsRoutes.delete("/:id", deleteLoad);
