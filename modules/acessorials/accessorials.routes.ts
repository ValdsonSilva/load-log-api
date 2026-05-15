import { Router } from "express";
import { requireAuth } from "../../middlewares/auth";
import { deleteAccessorial } from "./accessorials.controller";

export const accessorialsRoutes = Router();

accessorialsRoutes.use(requireAuth);

accessorialsRoutes.delete("/accessorials/:accessorialId", deleteAccessorial);