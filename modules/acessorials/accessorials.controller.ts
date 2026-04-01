import { RequestHandler } from "express";
import { AccessorialsRepository } from "./accessorials.repository";

const repository = new AccessorialsRepository()

export const deleteAccessorial: RequestHandler = async (req, res) => {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { accessorialId } = req.params as { accessorialId: string };

    if (!accessorialId) return res.status(400).json({ message: "Accessorial ID é obrigatório" });

    try {
        await repository.delete(accessorialId);
        res.status(204).send();
    } catch (error: any) {
        console.log("Erro: ", error.message);
        res.status(500).json({ message: "Erro ao excluir accessorial" });
    }
}