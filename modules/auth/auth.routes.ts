import { Router } from "express";
import { register, login, update, googleAuth, deactivateAccount } from "./auth.controller.js";
import { requireAuth } from "../../middlewares/auth.js";

export const authRoutes = Router();

authRoutes.post("/register", register);
authRoutes.post("/login", login);
authRoutes.post("/google", googleAuth);

authRoutes.use(requireAuth); // todas as rotas abaixo exigem autenticação
authRoutes.put("/update", update);
authRoutes.patch("/deactivate-account", deactivateAccount)