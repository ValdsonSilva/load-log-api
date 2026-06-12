import {
    DispatcherDriverConnectionStatus,
    LoadOfferDocumentType,
    LoadOfferStatus,
} from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/error.js";

const allowedTypes = Object.values(LoadOfferDocumentType);

function normalizeDocumentType(type: unknown): LoadOfferDocumentType {
    const raw = String(type || "OTHER").trim().toUpperCase();

    if (allowedTypes.includes(raw as LoadOfferDocumentType)) {
        return raw as LoadOfferDocumentType;
    }

    return LoadOfferDocumentType.OTHER;
}

export class LoadOfferDocumentsService {
    private async ensureDispatcherCanAccessOffer(dispatcherId: string, offerId: string) {
        const offer = await prisma.loadOffer.findFirst({
            where: {
                id: offerId,
                dispatcherId,
            },
            select: {
                id: true,
                dispatcherId: true,
                driverId: true,
                status: true,
            },
        });

        if (!offer) {
            throw new AppError(404, "Load offer not found");
        }

        return offer;
    }

    private async ensureDriverCanAccessOffer(driverId: string, offerId: string) {
        const offer = await prisma.loadOffer.findFirst({
            where: {
                id: offerId,
                driverId,
            },
            select: {
                id: true,
                dispatcherId: true,
                driverId: true,
                status: true,
            },
        });

        if (!offer) {
            throw new AppError(404, "Load offer not found");
        }

        return offer;
    }

    async uploadDispatcherDocument(
        dispatcherId: string,
        offerId: string,
        input: {
            type?: string;
            fileName: string;
            mimeType?: string;
            fileSize?: number;
            url: string;
            publicId?: string;
            notes?: string;
        }
    ) {
        const offer = await this.ensureDispatcherCanAccessOffer(dispatcherId, offerId);

        if (offer.status !== LoadOfferStatus.PENDING) {
            throw new AppError(400, "Documents can only be added to a pending load offer");
        }

        if (!input.fileName || !input.url) {
            throw new AppError(400, "fileName and url are required");
        }

        const document = await prisma.loadOfferDocument.create({
            data: {
                loadOfferId: offerId,
                uploadedById: dispatcherId,
                type: normalizeDocumentType(input.type),
                fileName: input.fileName,
                mimeType: input.mimeType ?? null,
                fileSize: input.fileSize ?? null,
                url: input.url,
                publicId: input.publicId ?? null,
                notes: input.notes ?? null,
            },
        });

        return { document };
    }

    async listDispatcherDocuments(dispatcherId: string, offerId: string) {
        await this.ensureDispatcherCanAccessOffer(dispatcherId, offerId);

        const data = await prisma.loadOfferDocument.findMany({
            where: {
                loadOfferId: offerId,
            },
            orderBy: {
                createdAt: "desc",
            },
            include: {
                uploadedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        userType: true,
                    },
                },
                copiedToAttachment: true,
            },
        });

        return { data };
    }

    async listDriverDocuments(driverId: string, offerId: string) {
        await this.ensureDriverCanAccessOffer(driverId, offerId);

        const data = await prisma.loadOfferDocument.findMany({
            where: {
                loadOfferId: offerId,
            },
            orderBy: {
                createdAt: "desc",
            },
            include: {
                uploadedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        userType: true,
                    },
                },
            },
        });

        return { data };
    }

    async deleteDispatcherDocument(
        dispatcherId: string,
        offerId: string,
        documentId: string
    ) {
        const offer = await this.ensureDispatcherCanAccessOffer(dispatcherId, offerId);

        if (offer.status !== LoadOfferStatus.PENDING) {
            throw new AppError(400, "Documents can only be deleted from a pending load offer");
        }

        const document = await prisma.loadOfferDocument.findFirst({
            where: {
                id: documentId,
                loadOfferId: offerId,
                uploadedById: dispatcherId,
            },
        });

        if (!document) {
            throw new AppError(404, "Document not found");
        }

        await prisma.loadOfferDocument.delete({
            where: {
                id: documentId,
            },
        });

        return {
            deleted: true,
            id: documentId,
        };
    }

    async copyOfferDocumentsToLoad(
        tx: any,
        input: {
            loadOfferId: string;
            loadId: string;
            driverId: string;
        }
    ) {
        const documents = await tx.loadOfferDocument.findMany({
            where: {
                loadOfferId: input.loadOfferId,
                copiedToAttachmentId: null,
            },
        });

        if (documents.length === 0) {
            return [];
        }

        const copiedDocuments = [];

        for (const document of documents) {
            const attachment = await tx.attachment.create({
                data: {
                    loadId: input.loadId,
                    uploadedById: document.uploadedById,

                    type: this.mapOfferDocumentTypeToAttachmentType(document.type),

                    fileName: document.fileName,
                    mimeType: document.mimeType,
                    fileSize: document.fileSize,

                    url: document.url,
                    publicId: document.publicId,

                    notes: document.notes,
                },
            });

            await tx.loadOfferDocument.update({
                where: {
                    id: document.id,
                },
                data: {
                    copiedToAttachmentId: attachment.id,
                },
            });

            copiedDocuments.push(attachment);
        }

        return copiedDocuments;
    }

    private mapOfferDocumentTypeToAttachmentType(type: LoadOfferDocumentType) {
        switch (type) {
            case LoadOfferDocumentType.RATE_CONFIRMATION:
                return "RATE_CONFIRMATION";

            case LoadOfferDocumentType.INSTRUCTIONS:
                return "OTHER";

            case LoadOfferDocumentType.CUSTOMER_DOCUMENT:
                return "OTHER";

            default:
                return "OTHER";
        }
    }
}