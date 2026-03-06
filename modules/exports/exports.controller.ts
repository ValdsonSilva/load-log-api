import type { RequestHandler } from "express";
import { AppError } from "../../utils/error.js";
import { ExportsService } from "./exports.service.js";
import { error } from "console";

const service = new ExportsService();

export const createLoadExport: RequestHandler = async (req, res) => {
    const userId = req.auth?.userId;
    if (!userId) throw new AppError(401, "Unauthorized");

    try {
        const format = req.query.format?.toString().toUpperCase() || "PDF";

        const result = await service.createExport(userId, req.params.loadId as any, format as any);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=load-${req.params.loadId}-v${result.version}.pdf`
        );

        res.status(201).send(result.fileBuffer);
    } catch (err: any) {
        return res.status(500).json({ message: "Erro ao exportar pdf", error: err.message })
    }
};

export const listLoadExports: RequestHandler = async (req, res) => {
    const userId = req.auth?.userId;
    if (!userId) throw new AppError(401, "Unauthorized");

    const exports = await service.listExports(userId, req.params.loadId as any);
    res.json(exports);
};