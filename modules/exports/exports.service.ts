import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../utils/error.js";
import { sha256Hex } from "../../utils/hash.js";
import { ExportsRepository } from "./exports.repository.js";
import { Buffer } from "buffer";
import { Accessorial, Attachment, Dispute, EquipmentSpec, Load, LoadExport, PenaltyTerms, RateAgreement, Stop, TimelineEvent, TrackingRequirement } from "@prisma/client";
import crypto from "crypto";
import { DateTime } from "luxon";
import QRCode from "qrcode";
import PDFDocument from "pdfkit";


// snapshot determinístico
interface ISnapshot {
    exportMeta: {
        version: number,
        exportedAt: string,
        exportedBy: string,
    },
    load: Load & {
        rateAgreement: RateAgreement & { acessorials: Accessorial[] },
        equipmentSpec: EquipmentSpec,
        trackingReq: TrackingRequirement,
        penaltyTerms: PenaltyTerms,

        stops: Stop[],
        timelineEvents: TimelineEvent[],
        attachments: Attachment[],
        loadExports: LoadExport[],
        disputes: Dispute[]
    },
};

export class ExportsService {
    constructor(private repo = new ExportsRepository()) { }

    private async assertLoadOwned(userId: string, loadId: string) {
        const load = await prisma.load.findUnique({
            where: { id: loadId },
            select: { id: true, driverId: true },
        });

        if (!load) throw new AppError(404, "Load not found");
        if (load.driverId !== userId) throw new AppError(403, "Forbidden");

        return load;
    }

    private calculateDetentionFromTimeline(events: TimelineEvent[], detentionStartAfterHours: number = 2) {
        let shipperArrival: number | null = null;
        let shipperDeparture: number | null = null;

        let receiverArrival: number | null = null;
        let receiverDeparture: number | null = null;

        for (const event of events) {
            const time = new Date(event.occurredAtUtc).getTime();

            switch (event.type) {
                case "ARRIVED_AT_SHIPPER":
                    shipperArrival = time;
                    break;

                case "LEFT_SHIPPER":
                    shipperDeparture = time;
                    break;

                case "ARRIVED_AT_RECEIVER":
                    receiverArrival = time;
                    break;

                case "LEFT_RECEIVER":
                    receiverDeparture = time;
                    break;
            }
        }

        const results = [];

        // devo extrair esse valor da tabela rateAgreement.detentionStartsAfterHours
        // (2h) se passar disso, o motorista pode cobrar um extra pelo tempo de detenção
        const freeMinutes = detentionStartAfterHours * 60; // convertenndo em minutos

        if (shipperArrival && shipperDeparture) {
            // 
            const total = Math.max(0, (shipperDeparture - shipperArrival) / 60000); // 60000 milesegundos para converter em minutos
            results.push({
                location: "Shipper",
                totalMinutes: total,
                billableMinutes: Math.max(0, total - freeMinutes),
            });
        }

        if (receiverArrival && receiverDeparture) {
            const total = Math.max(0, (receiverDeparture - receiverArrival) / 60000);
            results.push({
                location: "Receiver",
                totalMinutes: total,
                billableMinutes: Math.max(0, total - freeMinutes),
            });
        }

        return results;
    }

    private async generatePdfFromSnapshot(snapshot: ISnapshot): Promise<Buffer> {
        return new Promise(async (resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    margin: 50,
                    bufferPages: true
                });

                const chunks: Uint8Array[] = [];
                doc.on("data", (c) => chunks.push(c));
                doc.on("end", () => resolve(Buffer.concat(chunks)));

                const { load, exportMeta } = snapshot;

                /* --------------------------------------------------
                   CONFIG
                -------------------------------------------------- */

                const DRIVER_TZ = load.createdTimeZone || "America/Los_Angeles";
                // devo poder capturar esse valor da tabela rateAgreement.detentionMaxCap
                const MAX_REASONABLE_DETENTION_HOURS = Number(load.rateAgreement.detentionMaxCap) || 72;

                const safe = (v: any, f = "Not Provided") =>
                    v === undefined || v === null || v === "" ? f : v;

                const formatDriverTime = (utc: string) =>
                    DateTime.fromISO(utc, { zone: "utc" })
                        .setZone(DRIVER_TZ)
                        .toFormat("LLL dd, yyyy hh:mm a") +
                    ` (${DateTime.fromISO(utc, { zone: "utc" })
                        .setZone(DRIVER_TZ)
                        .offsetNameShort}) — Driver Time`;

                const drawSectionHeader = (title: string) => {
                    doc.moveDown();
                    doc.rect(doc.page.margins.left, doc.y, doc.page.width - 100, 20)
                        .fill("#2f5fa7");

                    doc.fillColor("#fff")
                        .font("Helvetica-Bold")
                        .fontSize(10)
                        .text(title, doc.page.margins.left + 5, doc.y + 10);

                    doc.fillColor("black");
                    doc.moveDown();
                };

                /* --------------------------------------------------
                   DATA NORMALIZATION
                -------------------------------------------------- */

                // Deduplicate timeline
                const timeline = Array.from(
                    new Map(
                        load.timelineEvents?.map((e: TimelineEvent) => [
                            `${e.type}-${e.occurredAtUtc}`,
                            e
                        ])
                    ).values()
                );

                // Geo validation - 
                load?.stops?.forEach((stop: Stop) => {
                    if (stop.country === "US" && stop.state?.length === 0) {
                        throw new Error(
                            `Geo validation failed for stop ${stop.city}`
                        );
                    }
                });

                const detentionStartsAfterHours = load.rateAgreement.detentionStartsAfterHours;

                const detentionResults =
                    this.calculateDetentionFromTimeline(timeline as any, detentionStartsAfterHours || 2);

                // converto o tempo em horas e verifico se ele passa do tempo limite de detenção
                detentionResults.forEach((d: any) => {
                    d.flag =
                        d.totalMinutes / 60 > MAX_REASONABLE_DETENTION_HOURS;
                });

                /* --------------------------------------------------
                   INTEGRITY HASH
                -------------------------------------------------- */

                const integrityPayload = {
                    loadId: load.id,
                    timeline: timeline.map((e: any) => ({
                        type: e.type,
                        occurredAtUtc: e.occurredAtUtc
                    })),
                    detention: detentionResults,
                    stops: load.stops,
                    exportedAt: exportMeta.exportedAt
                };

                const hash = crypto
                    .createHash("sha256")
                    .update(JSON.stringify(integrityPayload))
                    .digest("hex");

                const verificationUrl = `https://verify.myloadlog.com/?id=${load.id}&hash=${hash}`;
                const qr = await QRCode.toBuffer(verificationUrl);

                console.log("Qr-code: ", qr)

                const PAGE_WIDTH = doc.page.width - doc.page.margins.left - doc.page.margins.right;
                const START_X = doc.page.margins.left;

                const drawBlueHeader = (title: string) => {
                    const y = doc.y;

                    doc.save();
                    doc.rect(START_X, y, PAGE_WIDTH, 22)
                        .fill("#2f5fa7");

                    doc.fillColor("white")
                        .font("Helvetica-Bold")
                        .fontSize(11)
                        .text(title, START_X + 8, y + 6);

                    doc.restore();
                    // doc.moveUp(1.5)
                    doc.moveDown(1.5);
                };

                const drawCard = (height: number) => {
                    const y = doc.y;

                    doc.save();
                    doc.roundedRect(START_X, y, PAGE_WIDTH, height, 4)
                        .fill("#f4f6f8");
                    doc.restore();

                    doc.moveDown(6); //5.8
                };

                /* --------------------------------------------------
                   HEADER
                -------------------------------------------------- */
                // Logo area (opcional espaço reservado)
                doc.font("Helvetica-Bold")
                    .fontSize(16)
                    .text("My Load Log", START_X);

                doc.fontSize(18)
                    .text("LOAD PROOF REPORT", { align: "right" });

                doc.moveDown(1);

                doc.strokeColor("#cccccc")
                    .lineWidth(1)
                    .moveTo(START_X, doc.y)
                    .lineTo(START_X + PAGE_WIDTH, doc.y)
                    .stroke();

                doc.moveDown(0.8);

                doc.fontSize(9)
                    .fillColor("#555")
                    .text(`Report ID: ${safe(load.id)}`, { continued: true })
                    .text(`Generated: ${formatDriverTime(exportMeta.exportedAt)}`, { align: "right" });

                doc.moveDown(3);
                doc.fillColor("black");

                /* --------------------------------------------------
                   LOAD DETAILS
                -------------------------------------------------- */
                drawBlueHeader("Load Details");

                const cardHeight = 110;
                drawCard(cardHeight);

                const leftCol = START_X + 15;
                const rightCol = START_X + PAGE_WIDTH / 2 + 10;
                let y = doc.y - cardHeight + 30; //20

                doc.fontSize(9).font("Helvetica");

                doc.text(`Broker: ${safe(load.brokerCompanyName)}`, leftCol, y);
                doc.text(`Load #: ${safe(load.loadNumber)}`, rightCol, y);

                y += 18;
                doc.text(`Origin: ${safe(load.expectedPickupCity)}`, leftCol, y, { width: 250 });
                doc.text(`Destination: ${safe(load.expectedDeliveryCity)}`, rightCol, y, { width: 250 });

                y += 18;
                doc.text(`Equipment: ${safe(load.loadType)}`, leftCol, y);
                doc.text(`Temperature's range: ${safe(load.equipmentSpec.temperatureMinF)} - ${safe(load.equipmentSpec.temperatureMaxF)}`, rightCol, y);


                /* --------------------------------------------------
                   STOPS
                -------------------------------------------------- */

                drawBlueHeader("Stops");

                drawCard(100); //80

                let stopY = doc.y - 80; //60

                doc.font("Helvetica-Bold").fontSize(9);

                doc.text("Type", START_X + 15, stopY);
                doc.text("Location", START_X + 100, stopY);
                doc.text("Country", START_X + 400, stopY);

                stopY += 15;
                doc.font("Helvetica");

                load.stops.forEach((stop: any) => {
                    doc.text(stop.type, START_X + 15, stopY);
                    doc.text(`${stop.city}, ${stop.state}`, START_X + 100, stopY);
                    doc.text(stop.country, START_X + 400, stopY);
                    stopY += 20;
                });

                /* --------------------------------------------------
                   TIMELINE
                -------------------------------------------------- */

                drawBlueHeader("Timeline");

                const rowHeight = 18;
                let tableY = doc.y;

                const columns = {
                    event: START_X + 10,
                    time: START_X + 120,
                    location: START_X + 300,
                    notes: START_X + 420
                };

                // Header
                doc.font("Helvetica-Bold").fontSize(8);
                doc.text("Event", columns.event, tableY);
                doc.text("Driver Time", columns.time, tableY);
                doc.text("Location", columns.location, tableY);
                doc.text("Notes", columns.notes, tableY);

                tableY += rowHeight;
                doc.moveTo(START_X, tableY - 5)
                    .lineTo(START_X + PAGE_WIDTH, tableY - 5)
                    .strokeColor("#cccccc")
                    .stroke();

                // Rows
                doc.font("Helvetica").fontSize(8);

                timeline.forEach((event: any) => {
                    doc.text(event.type, columns.event, tableY, { width: 100 });
                    doc.text(formatDriverTime(event.occurredAtUtc.toISOString()), columns.time, tableY, { width: 180 });
                    doc.text(`${event.city || ""}, ${event.state || ""}`, columns.location, tableY, { width: 130 });
                    doc.text(safe(event.notes, "---"), columns.notes, tableY, { width: 100 });

                    tableY += rowHeight;

                    if (tableY > doc.page.height - 80) {
                        doc.addPage();
                        tableY = 60;
                    }
                });

                /* --------------------------------------------------
                   DETENTION
                -------------------------------------------------- */

                drawBlueHeader("Detention Summary");
                drawCard(180);

                let detY = doc.y - 80;

                doc.fontSize(9);

                detentionResults.forEach((d: any) => {
                    doc.text(
                        `${d.location}: ${(d.totalMinutes / 60).toFixed(2)} hrs`,
                        START_X + 15,
                        detY
                    );

                    if (d.flag) {
                        doc.fillColor("red")
                            .text("⚠ Extended waiting time", START_X + 350, detY)
                            .fillColor("black");
                    }

                    detY += 18;
                });


                /* --------------------------------------------------
                   EVIDENCE
                -------------------------------------------------- */
                // if (load.attachments?.length) {
                // drawBlueHeader("Evidence");
                drawSectionHeader("Verification");


                doc.fontSize(8)
                    .text(`SHA-256: ${hash}`)
                    .text(`Verification URL: ${verificationUrl}`);

                const evidenceStartY = doc.y;

                load.attachments.forEach((file: any, index: number) => {
                    doc.fontSize(9)
                        .text(`File: ${file.name}`, START_X + 15, evidenceStartY + index * 15)
                        .text(
                            `Uploaded: ${formatDriverTime(file.uploadedAt)}`,
                            START_X + 250,
                            evidenceStartY + index * 15
                        );
                });

                doc.image(qr, START_X + PAGE_WIDTH - 100, evidenceStartY, {
                    width: 80
                });

                doc.moveDown(4.8);
                // }

                /* --------------------------------------------------
                   AUTHENTICATION
                -------------------------------------------------- */

                // drawSectionHeader("Verification");

                // doc.fontSize(8)
                //     .text(`SHA-256: ${hash}`)
                //     .text(`Verification URL: ${verificationUrl}`);

                /* --------------------------------------------------
                   PAGINATION
                -------------------------------------------------- */

                const range = doc.bufferedPageRange();
                console.log("Range: ", range);

                for (let i = 1; i < range.count; i++) {
                    doc.switchToPage(i);

                    doc.fontSize(8)
                        .fillColor("#666")
                        .text(
                            `Page ${i} of ${range.count}`,
                            0,
                            doc.page.height - 30, // 30
                            { align: "center" }
                        );
                }

                doc.end();
            } catch (err) {
                reject(err);
            }
        });
    }

    async createExport(userId: string, loadId: string, format: "JSON" | "PDF" = "JSON") {
        await this.assertLoadOwned(userId, loadId);

        const load = await prisma.load.findUnique({
            where: { id: loadId },
            include: {
                stops: true,
                timelineEvents: {
                    orderBy: { occurredAtUtc: "asc" },
                    include: {
                        attachments: true,
                        revisions: true,
                    },
                },
                attachments: true,
                disputes: {
                    include: {
                        evidences: { include: { attachment: true } },
                    },
                },
                rateAgreement: { include: { accessorials: true } }
            },
        });

        if (!load) throw new AppError(404, "Load not found");

        const version = await this.repo.getNextVersion(loadId);

        // snapshot determinístico
        const snapshot = {
            exportMeta: {
                version,
                exportedAt: new Date().toISOString(),
                exportedBy: userId,
            },
            load,
        };

        // string estável
        const jsonString = JSON.stringify(snapshot);
        let fileBuffer: Buffer;

        if (format === "JSON") {
            fileBuffer = Buffer.from(jsonString);
        } else {
            fileBuffer = await this.generatePdfFromSnapshot(snapshot as any);
        }

        const checksum = sha256Hex(fileBuffer);

        const exportRecord = await this.repo.create({
            load: { connect: { id: loadId } },
            version,
            format,
            exportedBy: { connect: { id: userId } },
            checksumSha256: checksum,
        });

        return {
            fileBuffer,
            exportId: exportRecord.id,
            version,
            checksum,
            exportedAt: exportRecord.exportedAt,
        };
    }

    async listExports(userId: string, loadId: string) {
        await this.assertLoadOwned(userId, loadId);
        return this.repo.listByLoad(loadId);
    }
}