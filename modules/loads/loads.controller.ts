import type { RequestHandler } from "express";
import { CreateLoadSchema, ListLoadsSchema, LocationPointSchema } from "./loads.schema.js";
import { LoadsService } from "./loads.service.js";
import { AppError } from "../../utils/error.js";

const service = new LoadsService();

export const processLocationPoint: RequestHandler = async (req, res) => {
  const userId = req.auth?.userId;
  if (!userId) throw new AppError(401, "Unauthorized");

  const loadId = req.params.loadId as string;
  if (!loadId) throw new AppError(400, "LoadId é obrigatório")

  try {
    const input = LocationPointSchema.parse(req.body);

    if (!input) throw new AppError(400, "Input invalido");

    const locationPoint = await service.processNewLocationPoint(loadId, input)

    res.status(200).json(locationPoint)
  } catch (err: any) {
    console.log("Erro: ", err.message)
    return res.status(500).json({ message: "Erro ao criar locationPoint", error: err.message })
  }
}

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
  try {
    const userId = req.auth?.userId;
    if (!userId) throw new AppError(401, "Unauthorized");

    const id = req.params.id as string;
    if (!id) throw new AppError(400, "Load ID é obrigatório"); // Alterado para 400

    const { status, accessorials } = req.body;

    console.log({ body: req.body })

    // Validação: Se ambos forem nulos/undefined, nem chama o service
    if (!status && !accessorials) {
      throw new AppError(400, "No mínimo status ou accessorials deve ser fornecido");
    }

    // Criamos um objeto apenas com o que foi enviado
    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (accessorials !== undefined) updateData.accessorials = accessorials;

    const updated = await service.updateLoad(userId, id, updateData);

    return res.status(200).json(updated);

  } catch (error: any) {
    console.error("Erro no Controller PatchLoad:", error.message);

    // Se for um erro que nós lançamos (AppError), usamos o status dele
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        message: error.message
      });
    }

    // Se for um erro desconhecido (ex: Banco fora do ar), aí sim 500
    return res.status(500).json({
      message: "Internal Server Error",
      details: error.message
    });
  }
};

export const deleteLoad: RequestHandler = async (req, res) => {
  const userId = req.auth?.userId;
  if (!userId) throw new AppError(401, "Unauthorized");

  await service.deleteLoad(userId, req.params.id as string);
  res.status(204).send();
};
