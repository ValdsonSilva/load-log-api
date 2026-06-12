import {
    DispatcherDriverConnectionStatus,
    FieldSourceActorType,
    LoadOfferStatus,
    UserType,
} from "@prisma/client";
import { LoadOfferDocumentsService } from "./load-offer-documents.service.js";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/error.js";

const dispatcherTypes = [
    UserType.INDEPENDENT_DISPATCHER,
    UserType.COMPANY_DISPATCHER,
    UserType.CARRIER_ADMIN,
];

function createLoadNumber() {
    const date = new Date();
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    const random = Math.random().toString(36).slice(2, 7).toUpperCase();

    return `DSP-${y}${m}${d}-${random}`;
}

function parseDate(value: unknown) {
    if (!value) return null;

    const date = new Date(String(value));

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
}

const loadOfferDocumentsService = new LoadOfferDocumentsService();

export class LoadOffersService {
    private async ensureDispatcher(dispatcherId: string) {
        const dispatcher = await prisma.user.findUnique({
            where: { id: dispatcherId },
            select: {
                id: true,
                userType: true,
                isActive: true,
            },
        });

        if (!dispatcher || !dispatcher.isActive) {
            throw new AppError(401, "Unauthorized");
        }

        if (!dispatcher.userType || !dispatcherTypes.includes(dispatcher.userType)) {
            throw new AppError(403, "Only dispatcher users can perform this action");
        }

        return dispatcher;
    }

    private async ensureActiveConnection(dispatcherId: string, driverId: string) {
        const connection = await prisma.dispatcherDriverConnection.findFirst({
            where: {
                dispatcherId,
                driverId,
                status: DispatcherDriverConnectionStatus.ACTIVE,
            },
        });

        if (!connection) {
            throw new AppError(403, "Dispatcher is not connected to this driver");
        }

        return connection;
    }

    async createOffer(dispatcherId: string, input: any) {
        await this.ensureDispatcher(dispatcherId);

        const driverId = String(input.driverId || "").trim();

        if (!driverId) {
            throw new AppError(400, "driverId is required");
        }

        await this.ensureActiveConnection(dispatcherId, driverId);

        const offer = await prisma.loadOffer.create({
            data: {
                dispatcherId,
                driverId,

                pickupFacilityName: input.pickupFacilityName ?? null,
                pickupStreet1: input.pickupStreet1 ?? null,
                pickupCity: input.pickupCity ?? null,
                pickupState: input.pickupState ?? null,
                pickupPostalCode: input.pickupPostalCode ?? null,
                pickupCountry: input.pickupCountry ?? "US",

                deliveryFacilityName: input.deliveryFacilityName ?? null,
                deliveryStreet1: input.deliveryStreet1 ?? null,
                deliveryCity: input.deliveryCity ?? null,
                deliveryState: input.deliveryState ?? null,
                deliveryPostalCode: input.deliveryPostalCode ?? null,
                deliveryCountry: input.deliveryCountry ?? "US",

                rateAmount:
                    input.rateAmount !== undefined && input.rateAmount !== null
                        ? Number(input.rateAmount)
                        : null,

                estimatedMiles:
                    input.estimatedMiles !== undefined && input.estimatedMiles !== null
                        ? Number(input.estimatedMiles)
                        : null,

                scheduledPickupAt: parseDate(input.scheduledPickupAt),
                scheduledDeliveryAt: parseDate(input.scheduledDeliveryAt),

                brokerName: input.brokerName ?? null,
                customerName: input.customerName ?? null,
                notes: input.notes ?? null,
            },
            include: {
                driver: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        userType: true,
                    },
                },
            },
        });

        return { offer };
    }

    async listDispatcherOffers(dispatcherId: string) {
        await this.ensureDispatcher(dispatcherId);

        const data = await prisma.loadOffer.findMany({
            where: { dispatcherId },
            orderBy: { createdAt: "desc" },
            include: {
                driver: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        userType: true,
                    },
                },
                load: {
                    select: {
                        id: true,
                        loadNumber: true,
                        status: true,
                    },
                },
                documents: {
                    orderBy: {
                        createdAt: "desc",
                    },
                },
            },
        });

        return { data };
    }

    async getDispatcherOffer(dispatcherId: string, offerId: string) {
        await this.ensureDispatcher(dispatcherId);

        const offer = await prisma.loadOffer.findFirst({
            where: {
                id: offerId,
                dispatcherId,
            },
            include: {
                driver: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        userType: true,
                    },
                },
                load: {
                    include: {
                        stops: {
                            orderBy: { sequence: "asc" },
                        },
                        timelineEvents: {
                            orderBy: { sequence: "asc" },
                        },
                        attachments: true,
                        rateAgreement: {
                            include: {
                                accessorials: true,
                            },
                        },
                        documents: {
                            orderBy: {
                                createdAt: "desc",
                            }
                        },
                    },
                },
            },
        });

        if (!offer) {
            throw new AppError(404, "Load offer not found");
        }

        return { offer };
    }

    async cancelOffer(dispatcherId: string, offerId: string) {
        await this.ensureDispatcher(dispatcherId);

        const offer = await prisma.loadOffer.findFirst({
            where: {
                id: offerId,
                dispatcherId,
                status: LoadOfferStatus.PENDING,
            },
        });

        if (!offer) {
            throw new AppError(404, "Pending load offer not found");
        }

        const updated = await prisma.loadOffer.update({
            where: { id: offerId },
            data: {
                status: LoadOfferStatus.CANCELLED,
                cancelledAt: new Date(),
            },
        });

        return { offer: updated };
    }

    async listDriverOffers(driverId: string) {
        const data = await prisma.loadOffer.findMany({
            where: {
                driverId,
                status: LoadOfferStatus.PENDING,
            },
            orderBy: { createdAt: "desc" },
            include: {
                dispatcher: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        userType: true,
                        dispatcherCode: true,
                        dispatcherProfile: true,
                    },
                },
                documents: {
                    orderBy: {
                        createdAt: "desc",
                    },
                },
            },
        });

        return { data };
    }

    async getDriverOffer(driverId: string, offerId: string) {
        const offer = await prisma.loadOffer.findFirst({
            where: {
                id: offerId,
                driverId,
            },
            include: {
                dispatcher: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        userType: true,
                        dispatcherCode: true,
                        dispatcherProfile: true,
                    },
                },
                load: {
                    select: {
                        id: true,
                        loadNumber: true,
                        status: true,
                    },
                },
                documents: {
                    orderBy: {
                        createdAt: "desc",
                    },
                },
            },
        });

        if (!offer) {
            throw new AppError(404, "Load offer not found");
        }

        return { offer };
    }

    async rejectOffer(driverId: string, offerId: string, input: any) {
        const offer = await prisma.loadOffer.findFirst({
            where: {
                id: offerId,
                driverId,
                status: LoadOfferStatus.PENDING,
            },
        });

        if (!offer) {
            throw new AppError(404, "Pending load offer not found");
        }

        const updated = await prisma.loadOffer.update({
            where: { id: offerId },
            data: {
                status: LoadOfferStatus.REJECTED,
                rejectedAt: new Date(),
                rejectionReason: input.reason ?? null,
            },
        });

        return { offer: updated };
    }

    async acceptOffer(driverId: string, offerId: string) {
        const offer = await prisma.loadOffer.findFirst({
            where: {
                id: offerId,
                driverId,
                status: LoadOfferStatus.PENDING,
            },
        });

        if (!offer) {
            throw new AppError(404, "Pending load offer not found");
        }

        await this.ensureActiveConnection(offer.dispatcherId, driverId);

        const result = await prisma.$transaction(async (tx) => {
            const load = await tx.load.create({
                data: {
                    driverId,
                    dispatcherId: offer.dispatcherId,

                    loadNumber: createLoadNumber(),
                    status: "PRE_TRIP",

                    brokerCompanyName: offer.brokerName ?? undefined,

                    expectedPickupCity: offer.pickupCity ?? undefined,
                    expectedPickupState: offer.pickupState ?? undefined,
                    expectedDeliveryCity: offer.deliveryCity ?? undefined,
                    expectedDeliveryState: offer.deliveryState ?? undefined,

                    rateAgreement: {
                        create: {
                            rateAmount: offer.rateAmount ?? 0,
                            rateType: "FLAT",
                            quotedMiles: offer.estimatedMiles ?? undefined,
                            paymentMethod: "STANDARD",
                        },
                    },

                    stops: {
                        create: [
                            {
                                type: "PICKUP",
                                sequence: 1,
                                facilityName:
                                    offer.pickupFacilityName ?? "Dispatcher provided pickup",
                                street1: offer.pickupStreet1 ?? "Address not provided",
                                city: offer.pickupCity ?? "Unknown",
                                state: offer.pickupState ?? "Unknown",
                                postalCode: offer.pickupPostalCode ?? "Unknown",
                                country: offer.pickupCountry ?? "US",
                                scheduledStartAt: offer.scheduledPickupAt ?? undefined,
                                status: "PLANNED",
                            },
                            {
                                type: "DELIVERY",
                                sequence: 2,
                                facilityName:
                                    offer.deliveryFacilityName ?? "Dispatcher provided delivery",
                                street1: offer.deliveryStreet1 ?? "Address not provided",
                                city: offer.deliveryCity ?? "Unknown",
                                state: offer.deliveryState ?? "Unknown",
                                postalCode: offer.deliveryPostalCode ?? "Unknown",
                                country: offer.deliveryCountry ?? "US",
                                scheduledStartAt: offer.scheduledDeliveryAt ?? undefined,
                                status: "PLANNED",
                            },
                        ],
                    },
                },
                include: {
                    stops: true,
                    rateAgreement: true,
                },
            });

            const updatedOffer = await tx.loadOffer.update({
                where: { id: offer.id },
                data: {
                    status: LoadOfferStatus.ACCEPTED,
                    acceptedAt: new Date(),
                    loadId: load.id,
                },
            });

            await tx.loadFieldSource.createMany({
                data: [
                    {
                        loadId: load.id,
                        fieldName: "brokerCompanyName",
                        sourceActorType: FieldSourceActorType.DISPATCHER,
                        sourceUserId: offer.dispatcherId,
                        sourceContext: "LOAD_OFFER",
                    },
                    {
                        loadId: load.id,
                        fieldName: "rateAgreement.rateAmount",
                        sourceActorType: FieldSourceActorType.DISPATCHER,
                        sourceUserId: offer.dispatcherId,
                        sourceContext: "LOAD_OFFER",
                    },
                    {
                        loadId: load.id,
                        fieldName: "rateAgreement.quotedMiles",
                        sourceActorType: FieldSourceActorType.DISPATCHER,
                        sourceUserId: offer.dispatcherId,
                        sourceContext: "LOAD_OFFER",
                    },
                    {
                        loadId: load.id,
                        fieldName: "pickupStop",
                        sourceActorType: FieldSourceActorType.DISPATCHER,
                        sourceUserId: offer.dispatcherId,
                        sourceContext: "LOAD_OFFER",
                    },
                    {
                        loadId: load.id,
                        fieldName: "deliveryStop",
                        sourceActorType: FieldSourceActorType.DISPATCHER,
                        sourceUserId: offer.dispatcherId,
                        sourceContext: "LOAD_OFFER",
                    },
                ],
                skipDuplicates: true,
            });

            const copiedDocuments = await loadOfferDocumentsService.copyOfferDocumentsToLoad(
                tx,
                {
                    loadOfferId: offer.id,
                    loadId: load.id,
                    driverId,
                }
            );

            return {
                offer: updatedOffer,
                load,
                copiedDocuments,
            };
        });

        return result;
    }
}