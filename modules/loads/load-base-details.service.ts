import crypto from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/error.js";

const baseDetailsInclude = {
    rateAgreement: true,
    equipmentSpec: true,
} as const;

type UpdateLoadBaseDetailsInput = {
    userId: string;
    loadId: string;
    body: any;
};

export class LoadBaseDetailsService {
    async update(input: UpdateLoadBaseDetailsInput) {
        const { userId, loadId, body } = input;

        return prisma.$transaction(async (tx) => {
            const existing = await tx.load.findFirst({
                where: {
                    id: loadId,
                    driverId: userId,
                },
                include: baseDetailsInclude,
            });

            if (!existing) {
                throw new AppError(404, "Load not found");
            }

            if (
                body.loadNumber &&
                body.loadNumber !== existing.loadNumber
            ) {
                const duplicated = await tx.load.findFirst({
                    where: {
                        driverId: userId,
                        loadNumber: body.loadNumber,
                        NOT: {
                            id: loadId,
                        },
                    },
                    select: {
                        id: true,
                    },
                });

                if (duplicated) {
                    throw new AppError(
                        409,
                        "Another load already uses this loadNumber"
                    );
                }
            }

            const before = this.snapshot(existing);

            const loadData = this.buildLoadUpdateData(body);

            if (Object.keys(loadData).length > 0) {
                await tx.load.update({
                    where: {
                        id: loadId,
                    },
                    data: loadData,
                });
            }

            if (body.rateAgreement !== undefined) {
                await this.upsertRateAgreement(tx, {
                    loadId,
                    existingRateAgreement: existing.rateAgreement,
                    input: body.rateAgreement,
                });
            }

            if (body.equipmentSpec !== undefined) {
                await this.upsertEquipmentSpec(tx, {
                    loadId,
                    existingEquipmentSpec: existing.equipmentSpec,
                    input: body.equipmentSpec,
                });
            }

            const updated = await tx.load.findUnique({
                where: {
                    id: loadId,
                },
                include: baseDetailsInclude,
            });

            if (!updated) {
                throw new AppError(404, "Load not found after update");
            }

            const after = this.snapshot(updated);
            const changes = this.diff(before, after);

            if (Object.keys(changes).length === 0) {
                return {
                    load: this.toResponse(updated),
                    revision: null,
                    changed: false,
                };
            }

            const lastRevision = await tx.loadBaseDetailsRevision.findFirst({
                where: {
                    loadId,
                },
                orderBy: {
                    version: "desc",
                },
                select: {
                    version: true,
                },
            });

            const version = (lastRevision?.version ?? 0) + 1;

            const revisionPayload = {
                loadId,
                editedById: userId,
                version,
                before,
                after,
                changes,
                reason: body.reason ?? null,
            };

            const revisionHash = this.hashStable(revisionPayload);

            const revision = await tx.loadBaseDetailsRevision.create({
                data: {
                    ...revisionPayload,
                    revisionHash,
                },
                select: {
                    id: true,
                    version: true,
                    reason: true,
                    revisionHash: true,
                    createdAt: true,
                },
            });

            return {
                load: this.toResponse(updated),
                revision,
                changed: true,
            };
        });
    }

    async listRevisions(input: { userId: string; loadId: string }) {
        const load = await prisma.load.findFirst({
            where: {
                id: input.loadId,
                driverId: input.userId,
            },
            select: {
                id: true,
            },
        });

        if (!load) {
            throw new AppError(404, "Load not found");
        }

        return prisma.loadBaseDetailsRevision.findMany({
            where: {
                loadId: input.loadId,
            },
            orderBy: {
                version: "desc",
            },
            select: {
                id: true,
                version: true,
                before: true,
                after: true,
                changes: true,
                reason: true,
                revisionHash: true,
                createdAt: true,
                editedById: true,
            },
        });
    }

    private buildLoadUpdateData(body: any) {
        const allowedFields = [
            "driverOperatingAs",

            "loadNumber",
            "proNumber",
            "bolNumber",
            "bookingRefNumber",
            "trailerNumber",
            "containerNumber",
            "sealNumber",
            "commodityDesc",

            "pickupNumber",
            "poNumber",

            "loadType",
            "mode",

            "expectedPickupCity",
            "expectedPickupState",
            "expectedDeliveryCity",
            "expectedDeliveryState",

            "brokerCompanyName",
            "brokerMcNumber",
            "brokerPhone",
            "brokerEmail",
            "brokerAgentName",
            "brokerAgentPhone",
            "brokerAgentEmail",

            "dispatcherName",
            "dispatcherCompanyName",
            "dispatcherPhone",
            "dispatcherEmail",

            "carrierCompanyName",
            "carrierMcNumber",
            "carrierDotNumber",
            "carrierMainPhone",
        ];

        const data: Record<string, any> = {};

        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                data[field] = body[field];
            }
        }

        return data;
    }

    private async upsertRateAgreement(
        tx: any,
        params: {
            loadId: string;
            existingRateAgreement: any;
            input: any;
        }
    ) {
        const data = this.removeUndefined({
            rateAmount: params.input.rateAmount,
            rateType: params.input.rateType,
            quotedMiles: params.input.quotedMiles,
            paymentMethod: params.input.paymentMethod,
            quickPayFee: params.input.quickPayFee,
            detentionStartsAfterHours: params.input.detentionStartsAfterHours,
            detentionRatePerHour: params.input.detentionRatePerHour,
            detentionMaxCap: params.input.detentionMaxCap,
            layoverTermsText: params.input.layoverTermsText,
            tonuTermsText: params.input.tonuTermsText,
            notes: params.input.notes,
        });

        if (params.existingRateAgreement) {
            await tx.rateAgreement.update({
                where: {
                    loadId: params.loadId,
                },
                data,
            });

            return;
        }

        if (params.input.rateAmount === undefined || params.input.rateType === undefined) {
            throw new AppError(
                400,
                "rateAgreement.rateAmount and rateAgreement.rateType are required to create a rate agreement"
            );
        }

        await tx.rateAgreement.create({
            data: {
                loadId: params.loadId,
                rateAmount: params.input.rateAmount,
                rateType: params.input.rateType,
                quotedMiles: params.input.quotedMiles ?? null,
                paymentMethod: params.input.paymentMethod ?? "STANDARD",
                quickPayFee: params.input.quickPayFee ?? null,
                detentionStartsAfterHours:
                    params.input.detentionStartsAfterHours ?? null,
                detentionRatePerHour: params.input.detentionRatePerHour ?? null,
                detentionMaxCap: params.input.detentionMaxCap ?? null,
                layoverTermsText: params.input.layoverTermsText ?? null,
                tonuTermsText: params.input.tonuTermsText ?? null,
                notes: params.input.notes ?? null,
            },
        });
    }

    private async upsertEquipmentSpec(
        tx: any,
        params: {
            loadId: string;
            existingEquipmentSpec: any;
            input: any;
        }
    ) {
        const data = this.removeUndefined({
            trailerType: params.input.trailerType,
            temperatureSetpointF: params.input.temperatureSetpointF,
            temperatureMinF: params.input.temperatureMinF,
            temperatureMaxF: params.input.temperatureMaxF,
            weightLbs: params.input.weightLbs,
            palletCount: params.input.palletCount,
            pieceCount: params.input.pieceCount,
            hazmat: params.input.hazmat,
            highValue: params.input.highValue,
            sealRequired: params.input.sealRequired,
            securementRequired: params.input.securementRequired,
            securementMethods: params.input.securementMethods,
        });

        if (params.existingEquipmentSpec) {
            await tx.equipmentSpec.update({
                where: {
                    loadId: params.loadId,
                },
                data,
            });

            return;
        }

        if (params.input.trailerType === undefined) {
            throw new AppError(
                400,
                "equipmentSpec.trailerType is required to create equipment spec"
            );
        }

        await tx.equipmentSpec.create({
            data: {
                loadId: params.loadId,
                trailerType: params.input.trailerType,
                temperatureSetpointF: params.input.temperatureSetpointF ?? null,
                temperatureMinF: params.input.temperatureMinF ?? null,
                temperatureMaxF: params.input.temperatureMaxF ?? null,
                weightLbs: params.input.weightLbs ?? null,
                palletCount: params.input.palletCount ?? null,
                pieceCount: params.input.pieceCount ?? null,
                hazmat: params.input.hazmat ?? false,
                highValue: params.input.highValue ?? false,
                sealRequired: params.input.sealRequired ?? false,
                securementRequired: params.input.securementRequired ?? false,
                securementMethods: params.input.securementMethods ?? [],
            },
        });
    }

    private snapshot(load: any) {
        return this.toJsonSafe({
            id: load.id,
            driverId: load.driverId,
            driverOperatingAs: load.driverOperatingAs,

            loadNumber: load.loadNumber,
            proNumber: load.proNumber,
            bolNumber: load.bolNumber,
            bookingRefNumber: load.bookingRefNumber,
            trailerNumber: load.trailerNumber,
            containerNumber: load.containerNumber,
            sealNumber: load.sealNumber,
            commodityDesc: load.commodityDesc,

            pickupNumber: load.pickupNumber,
            poNumber: load.poNumber,

            loadType: load.loadType,
            mode: load.mode,
            status: load.status,

            expectedPickupCity: load.expectedPickupCity,
            expectedPickupState: load.expectedPickupState,
            expectedDeliveryCity: load.expectedDeliveryCity,
            expectedDeliveryState: load.expectedDeliveryState,

            brokerCompanyName: load.brokerCompanyName,
            brokerMcNumber: load.brokerMcNumber,
            brokerPhone: load.brokerPhone,
            brokerEmail: load.brokerEmail,
            brokerAgentName: load.brokerAgentName,
            brokerAgentPhone: load.brokerAgentPhone,
            brokerAgentEmail: load.brokerAgentEmail,

            dispatcherName: load.dispatcherName,
            dispatcherCompanyName: load.dispatcherCompanyName,
            dispatcherPhone: load.dispatcherPhone,
            dispatcherEmail: load.dispatcherEmail,

            carrierCompanyName: load.carrierCompanyName,
            carrierMcNumber: load.carrierMcNumber,
            carrierDotNumber: load.carrierDotNumber,
            carrierMainPhone: load.carrierMainPhone,

            rateAgreement: load.rateAgreement,
            equipmentSpec: load.equipmentSpec,
        });
    }

    private toResponse(load: any) {
        return this.toJsonSafe(load);
    }

    private toJsonSafe(value: any): any {
        if (value === null || value === undefined) {
            return value;
        }

        if (value instanceof Date) {
            return value.toISOString();
        }

        if (typeof value === "object" && typeof value.toNumber === "function") {
            return value.toNumber();
        }

        if (Array.isArray(value)) {
            return value.map((item) => this.toJsonSafe(item));
        }

        if (typeof value === "object") {
            const output: Record<string, any> = {};

            for (const [key, item] of Object.entries(value)) {
                output[key] = this.toJsonSafe(item);
            }

            return output;
        }

        return value;
    }

    private removeUndefined(data: Record<string, any>) {
        const output: Record<string, any> = {};

        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined) {
                output[key] = value;
            }
        }

        return output;
    }

    private diff(before: any, after: any) {
        const changes: Record<string, any> = {};

        const walk = (previous: any, next: any, path: string[] = []) => {
            const previousIsObject =
                previous &&
                typeof previous === "object" &&
                !Array.isArray(previous);

            const nextIsObject =
                next &&
                typeof next === "object" &&
                !Array.isArray(next);

            if (previousIsObject && nextIsObject) {
                const keys = new Set([
                    ...Object.keys(previous),
                    ...Object.keys(next),
                ]);

                for (const key of keys) {
                    walk(previous[key], next[key], [...path, key]);
                }

                return;
            }

            if (JSON.stringify(previous) !== JSON.stringify(next)) {
                changes[path.join(".")] = {
                    before: previous ?? null,
                    after: next ?? null,
                };
            }
        };

        walk(before, after);

        return changes;
    }

    private hashStable(value: unknown) {
        return crypto
            .createHash("sha256")
            .update(JSON.stringify(value))
            .digest("hex");
    }
}