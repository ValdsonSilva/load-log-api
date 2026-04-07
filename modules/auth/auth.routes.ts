import { Router } from "express";
import { register, login, update } from "./auth.controller.js";

export const authRoutes = Router();

authRoutes.post("/register", register);
authRoutes.post("/login", login);
authRoutes.put("/update", update);