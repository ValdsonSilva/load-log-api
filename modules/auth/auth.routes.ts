import { Router } from "express";
import { register, login, update } from "./auth.controller.js";
import { requireAuth } from "../../middlewares/auth.js";

export const authRoutes = Router();

authRoutes.post("/register", register);
authRoutes.post("/login", login);

authRoutes.use(requireAuth); // todas as rotas abaixo exigem autenticação
authRoutes.put("/update", update);