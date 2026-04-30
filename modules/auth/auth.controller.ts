import type { Request, RequestHandler, Response } from "express";
import { RegisterSchema, LoginSchema, UpdateUserSchema } from "./auth.schema.js";
import { AuthService } from "./auth.service.js";
import { OAuth2Client } from 'google-auth-library';
import { prisma } from "../../lib/prisma.js";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

export const googleAuth = async (req: Request, res: Response) => {
    const { idToken } = req.body;

    try {
        // 1. Validar o token com o Google
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload) throw new Error("Invalid Google Token");

        const { email, name, sub: googleId, picture } = payload;

        // 2. Localizar ou criar o usuário (Sign up / Sign in)
        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    email: email!,
                    name,
                    googleId,
                    avatarUrl: picture,
                    // Senha não é necessária para login social
                },
            });
        }

        // 3. Gerar o SEU Token JWT (reutilize sua lógica de login atual)
        const token = jwt.sign({ userId: user.id }, env.JWT_SECRET, { expiresIn: "7d" });

        return res.json({ token, user });
    } catch (error) {
        return res.status(401).json({ message: "Google authentication failed" });
    }
};