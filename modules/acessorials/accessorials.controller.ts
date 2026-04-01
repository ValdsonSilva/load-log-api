import { RequestHandler } from "express";
import { AccessorialsRepository } from "./accessorials.repository";

const repository = new AccessorialsRepository()

export const deleteAccessorial: RequestHandler = async (req, res) => {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params as { id: string };

    if (!id) return res.status(400).json({ message: "Accessorial ID é obrigatório" });

    try {
        await repository.delete(id);
        res.status(204).send();
    } catch (error: any) {
        console.log("Erro: ", error.message);
        res.status(500).json({ message: "Erro ao excluir accessorial" });
    }
}