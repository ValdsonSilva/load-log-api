import { LoadsRepository } from "./loads.repository.js";
import { AppError } from "../../utils/error.js";
import { Load, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export class LoadsService {
    constructor(private repo = new LoadsRepository()) { }

    async createLoad(userId: string, input: Prisma.LoadCreateInput) {
        // regra: loadNumber único por driver (já está no schema com @@unique([driverId, loadNumber]))
        return this.repo.create({
            driver: { connect: { id: userId } },
            driverOperatingAs: input.driverOperatingAs,
            loadNumber: input.loadNumber,
            loadType: input.loadType,
            mode: input.mode,
            brokerCompanyName: input.brokerCompanyName,
            brokerMcNumber: input.brokerMcNumber,
            brokerPhone: input.brokerPhone,
            brokerEmail: input.brokerEmail,
            brokerAgentName: input.brokerAgentName,
            brokerAgentPhone: input.brokerAgentPhone,
            brokerAgentEmail: input.brokerAgentEmail,
            dispatcherName: input.dispatcherName,
            dispatcherCompanyName: input.dispatcherCompanyName,
            dispatcherPhone: input.dispatcherPhone,
            dispatcherEmail: input.dispatcherEmail,
            carrierCompanyName: input.carrierCompanyName ?? "N/A",
            carrierMcNumber: input.carrierMcNumber,
            carrierDotNumber: input.carrierDotNumber,
            carrierMainPhone: input.carrierMainPhone,
            expectedDeliveryCity: input.expectedDeliveryCity,
            expectedDeliveryState: input.expectedDeliveryState,
            expectedPickupCity: input.expectedPickupCity,
            expectedPickupState: input.expectedPickupState,
            rateAgreement: input.rateAgreement
        });
    }

    async listLoads(userId: string, filters: { status?: string; q?: string }) {
        const where: any = { driverId: userId };

        if (filters.status) where.status = filters.status;
        if (filters.q) {
            where.OR = [
                { loadNumber: { contains: filters.q, mode: "insensitive" } },
                { brokerCompanyName: { contains: filters.q, mode: "insensitive" } },
            ];
        }

        return this.repo.list(where);
    }

    async getLoad(userId: string, loadId: string) {
        const load = await this.repo.findById(loadId);
        if (!load) throw new AppError(404, "Load not found");
        if (load.driverId !== userId) throw new AppError(403, "Forbidden");
        return load;
    }

    async updateLoad(userId: string, loadId: string, updateData: any) {
        // 1. Busca o load atual (importante: inclua o rateAgreement na busca)
        await this.getLoad(userId, loadId);

        // 2. Prepara os dados básicos do Load (Status, etc.)
        const data: any = {};
        if (updateData.status !== undefined) {
            data.status = updateData.status;
        }

        // 3. Executa o Update Principal (Status e outros campos do Load)
        const updatedLoad = await this.repo.update(
            loadId,
            data
        );

        // 4. BRAÇO FORTE: Inserção manual dos acessórios
        const accessorialsList = Array.isArray(updateData.accessorials)
            ? updateData.accessorials
            : updateData.accessorials ? [updateData.accessorials] : [];

        if (accessorialsList.length > 0) {
            let rateAgreementId = updatedLoad.rateAgreement?.id;

            if (!rateAgreementId) {
                // Se por algum motivo não houver RateAgreement, você pode criar um aqui
                // ou lançar um erro dependendo da sua regra de negócio.
                const newRateAgreement = await prisma.rateAgreement.create({
                    data: {
                        loadId,
                        rateAmount: 0,
                        rateType: 'FLAT',
                    }
                })
                rateAgreementId = newRateAgreement.id
            }

            // Criamos os novos acessórios vinculando-os diretamente ao ID do RateAgreement
            // Isso GARANTE que os antigos não sejam tocados.
            await prisma.accessorial.createMany({
                data: accessorialsList.map((acc: any) => ({
                    type: acc.type,
                    amount: acc.amount,
                    notes: acc.notes,
                    rateAgreementId: rateAgreementId // A chave estrangeira direta
                }))
            });
        }

        // 5. Retorna o Load completo (Opcional: fazer um fetch final para vir tudo atualizado)
        return await this.repo.findById(loadId);
    }

    async deleteLoad(userId: string, loadId: string) {
        await this.getLoad(userId, loadId);
        return this.repo.delete(loadId);
    }
}
