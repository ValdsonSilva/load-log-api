import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/error.js";

export class AuthService {
    async register(input: { email: string; password: string; name?: string; phone?: string }) {
        try {
            const existing = await prisma.user.findUnique({ where: { email: input.email } });
            if (existing) throw new AppError(409, "Email already in use");

            const hash = await bcrypt.hash(input.password, 10);
            console.log("senha hashada: ", hash);

            const user = await prisma.user.create({
                data: {
                    email: input.email,
                    name: input.name,
                    phone: input.phone,
                    passwordHash: hash
                },
                select: { id: true, email: true, name: true, phone: true },
            });

            console.log("usuário criado: ", user);

            const token = jwt.sign(
                { userId: user.id },
                env.JWT_SECRET as string,
                { expiresIn: "7d" }
            );

            return { user, token };

        } catch (error) {
            console.error("ERRO NO REGISTER SERVICE:", error);
            throw error;
        }
    }

    async login(input: { email: string; password: string }) {
        const user = await prisma.user.findUnique({ where: { email: input.email } });
        if (!user) throw new AppError(401, "Invalid credentials - (email)");

        const ok = await bcrypt.compare(input.password, user.passwordHash);
        if (!ok) throw new AppError(401, "Invalid credentials - (password)");

        const token = jwt.sign({ userId: user.id }, env.JWT_SECRET, { expiresIn: "7d" });
        return {
            user: { id: user.id, email: user.email, name: user.name, phone: user.phone },
            token,
        };
    }
}

// login - dados de teste

// {
//     "email": "driver1@test.com",
//     "password": "12345678"
// }
