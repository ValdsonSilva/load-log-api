import { RequestHandler } from "express";
import { AccessorialsRepository } from "./accessorials.repository";

const repository = new AccessorialsRepository();

export const deleteAccessorial: RequestHandler = async (req, res) => {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // AJUSTE: O nome aqui deve bater com o que está no arquivo de routes (:accessorialId)
    const { accessorialId } = req.params;

    if (!accessorialId) {
        return res.status(400).json({ message: "Accessorial ID é obrigatório" });
    }

    try {
        // No Repository, você passa o ID correto
        await repository.delete(accessorialId as string);

        // 204 No Content é o status perfeito para DELETE com sucesso
        return res.status(204).send();
    } catch (error: any) {
        console.error("Erro ao excluir accessorial: ", error.message);

        // Se for um erro de "Registro não encontrado", o Prisma costuma lançar o código P2025
        if (error.code === 'P2025') {
            return res.status(404).json({ message: "Acessório não encontrado" });
        }

        return res.status(500).json({ message: "Erro interno ao excluir accessorial" });
    }
}