import type { RequestHandler } from "express";
import { CreateLoadSchema, ListLoadsSchema } from "./loads.schema.js";
import { LoadsService } from "./loads.service.js";
import { AppError } from "../../utils/error.js";
import { Prisma } from "@prisma/client";

const service = new LoadsService();

export const createLoad: RequestHandler = async (req, res) => {
  const userId = req.auth?.userId;
  if (!userId) throw new AppError(401, "Unauthorized");

  try {
    const input = CreateLoadSchema.parse(req.body);

    if (!input) throw new AppError(400, "Input invalido")

    const load = await service.createLoad(userId, input as any);
    res.status(201).json(load);
  } catch (err: any) {
    console.log("Erro: ", err.message)
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

export const patchLoad: RequestHandler = async (req, res) => {
  const userId = req.auth?.userId;
  if (!userId) throw new AppError(401, "Unauthorized");

  const id = req.params?.id;
  if (!id) throw new AppError(401, "Loads id is required")

  const status = String(req.body?.status);
  const accessorials: Prisma.AccessorialUpdateInput[] = req.body.accessorials
  if (!status && !accessorials) throw new AppError(400, "status/accessorials is required");

  const data = {
    status,
    accessorials
  }

  try {
    const updated = await service.updateLoad(userId, req.params.id as string, data);
    res.status(200).json(updated);
  } catch (erro: any) {
    console.log("Erro: ", erro.message);
    return res.status(500).json({ message: "Erro ao atualizar Load", erro: erro.message });
  };
};

export const deleteLoad: RequestHandler = async (req, res) => {
  const userId = req.auth?.userId;
  if (!userId) throw new AppError(401, "Unauthorized");

  await service.deleteLoad(userId, req.params.id as string);
  res.status(204).send();
};
