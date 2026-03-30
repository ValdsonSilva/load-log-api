import { LoadsRepository } from "./loads.repository.js";
import { AppError } from "../../utils/error.js";
import { Load, Prisma } from "@prisma/client";

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

    // async update(userId: string, loadId: string, status: string) {
    //     // regra: do load só pode ser atualizado o status válido
    //     await this.getLoad(userId, loadId);
    //     return this.repo.update(loadId, { status: status as any });
    // }

    async update(userId: string, loadId: string, updateData: {
        status?: string,
        accessorials?: Prisma.AccessorialUpdateInput[]
    }) {
        // 1. Validar se o load pertence ao usuário
        await this.getLoad(userId, loadId);

        // 2. Preparar o objeto de atualização
        const data: any = {};

        if (updateData.status !== undefined) {
            data.status = updateData.status;
        }

        if (updateData.accessorials !== undefined) {
            data.rateAgreement = {
                update: {
                    accessorials: {
                        // Estratégia: Deletar os antigos e criar os novos (mais simples para edição de listas)
                        deleteMany: {},
                        create: updateData.accessorials.map(acc => ({
                            type: acc.type,
                            amount: acc.amount,
                            notes: acc.notes
                        }))
                    }
                }
            };
        }

        if (Object.keys(data).length === 0) return new AppError(400, "Nenhum campo para atualizar");

        return this.repo.update(loadId, data);
    }

    async deleteLoad(userId: string, loadId: string) {
        await this.getLoad(userId, loadId);
        return this.repo.delete(loadId);
    }
}
