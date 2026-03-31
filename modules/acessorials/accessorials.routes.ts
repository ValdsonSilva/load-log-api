import { Router } from "express";
import { loadsRoutes } from "../loads/loads.routes";
import { requireAuth } from "../../middlewares/auth";
import { deleteAccessorial } from "./accessorials.controller";

export const acessorialsRoutes = Router();

loadsRoutes.use(requireAuth);

loadsRoutes.delete("/accessorials/:accessorialId", deleteAccessorial)