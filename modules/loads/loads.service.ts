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

    async processNewLocationPoint(loadId: string, newPoint: any, lastPoint: any) {
        const { latitude, longitude, speed, accuracy } = newPoint;

        // 1. FILTRO DE PRECISÃO (Item 8)
        // Ignora pontos com baixa precisão (ex: acima de 30 metros)
        if (accuracy > 30) return;

        // 2. FILTRO DE MOVIMENTO (Item 5)
        // Ignora pontos se o caminhão estiver parado (ex: speed < 1 m/s ou ~3.6 km/h)
        // Isso evita o "GPS Drift" que infla as milhas enquanto o motorista dorme/come.
        if (speed < 1) return;

        // 3. CÁLCULO DE DISTÂNCIA (Haversine)
        const distanceCovered = calculateDeadheadDistance(lastPoint.latitude, lastPoint.longitude, latitude, longitude);

        // 4. FILTRO DE SALTO MÍNIMO
        // Só registra se ele andou pelo menos 50 metros para evitar excesso de dados
        if (distanceCovered < 0.05) return;

        if (!loadId) return

        // busca o status atual da carga em questão
        const load = await prisma.load.findUnique({
            where: {
                id: loadId
            }
        })

        if (load?.status === 'CANCELLED') {
            return; // Para o rastreamento aqui
        }

        // 5. UPDATE NO BANCO (Prisma)
        // Aqui você identifica a fase atual e soma no acumulador correto
        const columnToIncrement = this.determineTripPhase(load?.status!); // Mapeia o status para a fase

        // 3. Descobre o nome da fase para o log (ex: "DEADHEAD")
        const phaseName = this.mapStatusToTripPhase(load?.status!);

        await prisma.$transaction([
            prisma.load.update({
                where: { id: loadId },
                data: {
                    [columnToIncrement]: { increment: distanceCovered }, // Ex: incrementa realMilesDeadhead
                    totalRealMiles: { increment: distanceCovered }
                }
            }),

            // 6. SALVA O BREADCRUMB (Para a prova real do Item 7)
            prisma.locationPoint.create({
                data: {
                    loadId,
                    latitude,
                    longitude,
                    speed,
                    accuracy,
                    phase: phaseName,   // Agora aqui vai "DEADHEAD", "LOADED", etc.
                }
            })
        ]);
    }

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
            rateAgreement: {
                create: {
                    rateAmount: input.rateAgreement?.create?.rateAmount ?? 0,
                    rateType: input.rateAgreement?.create?.rateType ?? "FLAT",
                    paymentMethod: input.rateAgreement?.create?.paymentMethod ?? "STANDARD",
                }
            },
            equipmentSpec: {
                create: {
                    trailerType: input.equipmentSpec?.create?.trailerType ?? "DRY_VAN",
                }
            },
            trackingReq: input.trackingReq,
            penaltyTerms: input.penaltyTerms,

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
