import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../utils/error.js";

export type AuthUser = { userId: string };

declare global {
  namespace Express {
    interface Request {
      auth?: AuthUser;
    }
  }
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw new AppError(401, "Unauthorized");

  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthUser;
    req.auth = payload;
    next();
  } catch {
    throw new AppError(401, "Invalid token");
  }
};
