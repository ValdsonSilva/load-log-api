import { Router } from "express";
import { loadsRoutes } from "../loads/loads.routes";
import { requireAuth } from "../../middlewares/auth";
import { deleteAccessorial } from "./accessorials.controller";

export const accessorialsRoutes = Router();

loadsRoutes.use(requireAuth);

accessorialsRoutes.delete("/accessorials/:accessorialId", deleteAccessorial)