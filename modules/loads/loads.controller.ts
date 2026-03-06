import type { RequestHandler } from "express";
import { CreateLoadSchema, ListLoadsSchema } from "./loads.schema.js";
import { LoadsService } from "./loads.service.js";
import { AppError } from "../../utils/error.js";

const service = new LoadsService();

export const createLoad: RequestHandler = async (req, res) => {
  const userId = req.auth?.userId;
  if (!userId) throw new AppError(401, "Unauthorized");

  try {
    const input = CreateLoadSchema.parse(req.body);

    if (!input) throw new AppError(400, "Input invalido")

    const load = await service.createLoad(userId, input);
    res.status(201).json(load);
  } catch (err: any) {
    return res.status(500).json({ message: "Erro ao criar load", error: err.message })
  }
};

export const listLoads: RequestHandler = async (req, res) => {
  const userId = req.auth?.userId;
  if (!userId) throw new AppError(401, "Unauthorized");

  const filters = ListLoadsSchema.parse(req.query);
  const loads = await service.listLoads(userId, filters);
  res.json(loads);
};

export const getLoad: RequestHandler = async (req, res) => {
  const userId = req.auth?.userId;
  if (!userId) throw new AppError(401, "Unauthorized");

  const load = await service.getLoad(userId, req.params.id as string);
  res.json(load);
};

export const patchStatus: RequestHandler = async (req, res) => {
  const userId = req.auth?.userId;
  if (!userId) throw new AppError(401, "Unauthorized");

  const status = String(req.body?.status ?? "");
  if (!status) throw new AppError(400, "status is required");

  const updated = await service.updateStatus(userId, req.params.id as string, status);
  res.json(updated);
};

export const deleteLoad: RequestHandler = async (req, res) => {
  const userId = req.auth?.userId;
  if (!userId) throw new AppError(401, "Unauthorized");

  await service.deleteLoad(userId, req.params.id as string);
  res.status(204).send();
};
