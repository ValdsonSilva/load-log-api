import { Router } from "express";
import { register, login } from "./auth.controller.js";

export const authRoutes = Router();

authRoutes.post("/register", register);
authRoutes.post("/login", login);

// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMzc0ZTNhZC1hYTcwLTQzYWEtOTFlZi01Y2Y2ZDBlMmRmZmYiLCJpYXQiOjE3NzI1OTQ1MDEsImV4cCI6MTc3MzE5OTMwMX0.92uwrf_sbkt7fqQVYzOe7Zd0piBZ1U9cZlApJFdL7T8