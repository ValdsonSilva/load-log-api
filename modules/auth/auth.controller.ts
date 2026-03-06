import type { RequestHandler } from "express";
import { RegisterSchema, LoginSchema } from "./auth.schema.js";
import { AuthService } from "./auth.service.js";

const service = new AuthService();

export const register: RequestHandler = async (req, res) => {
    try {
        const input = RegisterSchema.parse(req.body);
        console.log("input recebido: ", input)
        const result = await service.register(input);
        console.log("resultado do registro: ", result);
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
