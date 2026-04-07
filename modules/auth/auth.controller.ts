import type { RequestHandler } from "express";
import { RegisterSchema, LoginSchema, UpdateUserSchema } from "./auth.schema.js";
import { AuthService } from "./auth.service.js";

const service = new AuthService();

export const register: RequestHandler = async (req, res) => {
    try {
        const input = RegisterSchema.parse(req.body);
        const result = await service.register(input);
        res.status(201).json(result);
    } catch (erro) {
        return res.status(500).json({ message: "Erro ao criar usuário" })
    }
};

export const login: RequestHandler = async (req, res) => {
    const input = LoginSchema.parse(req.body);
    const result = await service.login(input);
    res.json(result);
};

export const update: RequestHandler = async (req, res) => {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    try {
        const input = UpdateUserSchema.parse(req.body);
        const result = await service.update(userId, input);
        res.status(201).json(result);
    } catch (erro: any) {
        return res.status(500).json({ message: "Erro ao atualizar usuário" + erro.message })
    }
};