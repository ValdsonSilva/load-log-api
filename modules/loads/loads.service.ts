import { LoadsRepository } from "./loads.repository.js";
import { AppError } from "../../utils/error.js";
import { Load, LoadStatus, Prisma, TripPhase } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { assertLoadIsNotCompleted } from "../../service/assertLoadIsNotCompleted.js";
import { calculateDeadheadDistance } from "./calculateDeadHeadDistance.js";

export class LoadsService {
    constructor(private repo = new LoadsRepository()) { }

    /**
        * Determina qual categoria de milhagem deve ser incrementada 
        * com base no status atual da carga.
    */
    private determineTripPhase(status: LoadStatus): keyof Load {
        const phaseMap: Record<LoadStatus, keyof Load> = {
            // 1. Bobtail: Apenas o caminhão (indo buscar trailer/garagem)
            PRE_TRIP: "realMilesBobtail",

            // 2. Deadhead: Caminhão + Trailer Vazio (indo para o Shipper)
            DRIVING: "realMilesDeadhead",

            // 3. Loaded: Do Shipper ao Receiver (Carregado)
            ACTIVE: "realMilesLoaded",
            // ARRIVED_AT_RECEIVER: "realMilesLoaded", // Ainda conta como carregado até descarregar

            // 4. Empty After Delivery: Após descarregar até o fim da jornada
            COMPLETED: "realMilesPostDelivery",

            // Estados que não contabilizam milhas operacionais (segurança)
            // PRE_TRIP: "totalRealMiles", // Fallback ou ignorar
            // DELIVERED: "totalRealMiles",
            CANCELLED: "totalRealMiles",
        };

        // Retorna o nome do campo na tabela Load ou um fallback seguro
        return phaseMap[status] || "totalRealMiles";
    }

    private mapStatusToTripPhase(status: LoadStatus): TripPhase {
        const phaseMap: Record<LoadStatus, TripPhase> = {
            PRE_TRIP: "BOBTAIL",
            DRIVING: "DEADHEAD",
            ACTIVE: "LOADED",
            COMPLETED: "POST_DELIVERY",
            CANCELLED: "OFF_DUTY", // Ou como você definiu no seu enum
        };

        return phaseMap[status] || "OFF_DUTY";
    }

    async processNewLocationPoint(loadId: string, newPoint: any) {
        const { latitude, longitude, speed, accuracy } = newPoint;
        if (!loadId) return;

        // 1. FILTRO DE PRECISÃO (Item 8) - Deve ser o primeiro de todos
        if (accuracy > 30) return;

        // 2. Busca o último ponto registrado
        const lastPoint = await prisma.locationPoint.findFirst({
            where: { loadId },
            orderBy: { timestamp: "desc" },
        });

        let distanceCovered = 0;
        if (lastPoint) {
            distanceCovered = calculateDeadheadDistance(
                Number(lastPoint.latitude),
                Number(lastPoint.longitude),
                latitude,
                longitude
            );

            // 3. FILTRO DE MOVIMENTO E SALTO MÍNIMO (Só se já houver um rastro)
            // Se estiver parado ou andou menos de 50m, ignora para não inflar dados
            if (speed < 1 || distanceCovered < 0.05) return;
        }

        // 4. Busca o status atual da carga
        const load = await prisma.load.findUnique({
            where: { id: loadId }
        });

        if (!load || load.status === 'CANCELLED') return;

        const columnToIncrement = this.determineTripPhase(load.status);
        const phaseName = this.mapStatusToTripPhase(load.status);

        // 5. Executa em transação para garantir integridade
        await prisma.$transaction(async (tx) => {
            // Só incrementa se houver distância real (evita erro no primeiro ponto)
            if (distanceCovered > 0) {
                await tx.load.update({
                    where: { id: loadId },
                    data: {
                        [columnToIncrement]: { increment: distanceCovered },
                        totalRealMiles: { increment: distanceCovered }
                    }
                });
            }

            // 6. SALVA O BREADCRUMB (Sempre salva se passar pelos filtros acima)
            await tx.locationPoint.create({
                data: {
                    loadId,
                    latitude,
                    longitude,
                    speed,
                    accuracy,
                    phase: phaseName,
                }
            });
        });
    }

    // async createLoad(userId: string, input: Prisma.LoadCreateInput) {
    //     // regra: loadNumber único por driver (já está no schema com @@unique([driverId, loadNumber]))
    //     return this.repo.create({
    //         driver: { connect: { id: userId } },
    //         driverOperatingAs: input.driverOperatingAs,
    //         loadNumber: input.loadNumber,
    //         loadType: input.loadType,
    //         mode: input.mode,
    //         brokerCompanyName: input.brokerCompanyName,
    //         brokerMcNumber: input.brokerMcNumber,
    //         brokerPhone: input.brokerPhone,
    //         brokerEmail: input.brokerEmail,
    //         brokerAgentName: input.brokerAgentName,
    //         brokerAgentPhone: input.brokerAgentPhone,
    //         brokerAgentEmail: input.brokerAgentEmail,
    //         dispatcherName: input.dispatcherName,
    //         dispatcherCompanyName: input.dispatcherCompanyName,
    //         dispatcherPhone: input.dispatcherPhone,
    //         dispatcherEmail: input.dispatcherEmail,
    //         carrierCompanyName: input.carrierCompanyName ?? "N/A",
    //         carrierMcNumber: input.carrierMcNumber,
    //         carrierDotNumber: input.carrierDotNumber,
    //         carrierMainPhone: input.carrierMainPhone,
    //         expectedDeliveryCity: input.expectedDeliveryCity,
    //         expectedDeliveryState: input.expectedDeliveryState,
    //         expectedPickupCity: input.expectedPickupCity,
    //         expectedPickupState: input.expectedPickupState,
    //         rateAgreement: {
    //             create: {
    //                 rateAmount: input.rateAgreement?.create?.rateAmount ?? 0,
    //                 rateType: input.rateAgreement?.create?.rateType ?? "FLAT",
    //                 paymentMethod: input.rateAgreement?.create?.paymentMethod ?? "STANDARD",
    //                 detentionStartsAfterHours: input.rateAgreement?.create?.detentionStartsAfterHours ?? 2,
    //                 detentionRatePerHour: input.rateAgreement?.create?.detentionRatePerHour ?? 0,
    //                 detentionMaxCap: input.rateAgreement?.create?.detentionMaxCap ?? 0,
    //                 layoverTermsText: input.rateAgreement?.create?.layoverTermsText,
    //             }
    //         },
    //         equipmentSpec: {
    //             create: {
    //                 trailerType: input.equipmentSpec?.create?.trailerType ?? "DRY_VAN",
    //             }
    //         },
    //         trackingReq: input.trackingReq,
    //         penaltyTerms: input.penaltyTerms,

    //     });
    // }

    async createLoad(userId: string, input: any) { // Use um DTO aqui se possível
        // Extraímos os dados que vieram do cliente
        const { rateAgreement, equipmentSpec, ...loadData } = input;

        return this.repo.create({
            ...loadData,
            driver: { connect: { id: userId } },

            // Aqui está a mágica:
            rateAgreement: {
                create: {
                    rateAmount: rateAgreement?.rateAmount ?? 0,
                    rateType: rateAgreement?.rateType ?? "FLAT",
                    paymentMethod: rateAgreement?.paymentMethod ?? "STANDARD",
                    detentionStartsAfterHours: rateAgreement?.detentionStartsAfterHours ?? 2,
                    detentionRatePerHour: rateAgreement?.detentionRatePerHour ?? 0,
                    detentionMaxCap: rateAgreement?.detentionMaxCap ?? 0,
                    layoverTermsText: rateAgreement?.layoverTermsText,
                }
            },
            equipmentSpec: {
                create: {
                    trailerType: equipmentSpec?.trailerType ?? "DRY_VAN",
                }
            }

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

        await assertLoadIsNotCompleted(loadId, this.repo, "Não é permitido atualizar uma carga já finalizada");

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
            // await prisma.accessorial.createMany({
            //     data: accessorialsList.map((acc: Accessorial) => ({
            //         type: acc.type,
            //         amount: acc.amount,
            //         notes: acc.notes,
            //         rateAgreementId: rateAgreementId, // A chave estrangeira direta
            //     })),
            // });
            await Promise.all(
                accessorialsList.map(async (acc: any) => {
                    return prisma.accessorial.create({
                        data: {
                            type: acc.type,
                            amount: acc.amount,
                            notes: acc.notes,
                            rateAgreementId: rateAgreementId,
                            // ✅ Agora conseguimos conectar os anexos que já existem
                            attachments: {
                                connect: acc.attachments.map((id: string) => ({ id }))
                            }
                        }
                    });
                })
            );
        }

        // 5. Retorna o Load completo (Opcional: fazer um fetch final para vir tudo atualizado)
        return await this.repo.findById(loadId);
    }

    async deleteLoad(userId: string, loadId: string) {
        await this.getLoad(userId, loadId);
        return this.repo.delete(loadId);
    }
}
