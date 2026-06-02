import { z } from "zod";

export const RegisterSchema = z.object({
    email: z.string(),
    password: z.string().min(8),
    name: z.string().min(1).optional(),
    phone: z.string().min(6).optional(),
    role: z.enum(["DRIVER", "ADMIN", "SUPER_ADMIN"]).optional(), // Adicione o campo de role
});

export const LoginSchema = z.object({
    email: z.string(),
    password: z.string().min(8),
});

export const UpdateUserSchema = z.object({
    email: z.string().optional(),
    name: z.string().min(1).optional(),
    phone: z.string().min(6).optional(),
    // password: z.string().min(8).optional(),
    defaultTimeZone: z.string().optional(),
    role: z.enum(["DRIVER", "ADMIN", "SUPER_ADMIN"]).optional(), // Adicione o campo de role
});