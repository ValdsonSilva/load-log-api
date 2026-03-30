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

    async updateLoad(userId: string, loadId: string, updateData: any) {
        // 1. Busca o load atual (importante: inclua o rateAgreement na busca)
        // Se o seu getLoad não traz o rateAgreement, você precisará ajustar a query lá
        const existingLoad = await this.getLoad(userId, loadId);

        const data: any = {};

        // Tratamento do Status (Proteção contra o erro de Enum "undefined")
        if (updateData.status !== undefined && updateData.status !== null) {
            data.status = updateData.status;
        }

        // Tratamento de Acessórios (Garantindo que seja Array)
        const accessorialsList = Array.isArray(updateData.accessorials)
            ? updateData.accessorials
            : updateData.accessorials ? [updateData.accessorials] : [];

        if (accessorialsList.length > 0) {
            // Valores padrão vindos do banco ou valores fixos de fallback
            const currentRA = existingLoad.rateAgreement;

            data.rateAgreement = {
                upsert: {
                    create: {
                        // CAMPOS OBRIGATÓRIOS DO SEU MODEL:
                        rateAmount: currentRA?.rateAmount ?? 0,
                        rateType: currentRA?.rateType ?? 'FLAT', // Ajuste para um valor válido do seu Enum
                        paymentMethod: currentRA?.paymentMethod ?? 'STANDARD',

                        accessorials: {
                            create: accessorialsList.map((acc: any) => ({
                                type: acc.type,
                                amount: acc.amount,
                                notes: acc.notes
                            }))
                        }
                    },
                    update: {
                        accessorials: {
                            deleteMany: {}, // Reset da lista
                            create: accessorialsList.map((acc: any) => ({
                                type: acc.type,
                                amount: acc.amount,
                                notes: acc.notes
                            }))
                        }
                    }
                }
            };
        }

        if (Object.keys(data).length === 0) {
            throw new AppError(400, "Nenhum campo para atualizar");
        }

        return await this.repo.update(
            loadId,
            data
        );
    }

    async deleteLoad(userId: string, loadId: string) {
        await this.getLoad(userId, loadId);
        return this.repo.delete(loadId);
    }
}
