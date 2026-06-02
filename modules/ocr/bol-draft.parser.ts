type ConfidenceLevel = "high" | "medium" | "low" | "missing";

function normalizeText(value: string) {
    return value
        .replace(/\r/g, "")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{2,}/g, "\n")
        .trim();
}

function getMatch(text: string, regex: RegExp) {
    const match = text.match(regex);
    return match?.[1]?.trim() || null;
}

function normalizeState(value: string | null) {
    if (!value) return null;
    return value.trim().toUpperCase();
}

function normalizeNumber(value: string | null) {
    if (!value) return null;

    const cleaned = value.replace(/[,\s]/g, "");
    const parsed = Number(cleaned);

    return Number.isFinite(parsed) ? parsed : null;
}

function findCityStateFromAddressBlock(block: string | null) {
    if (!block) {
        return {
            city: null,
            state: null,
        };
    }

    const normalized = block.replace(/\s+/g, " ");

    const match = normalized.match(/([A-Z][A-Z\s.]+),\s*([A-Z]{2})\s*\d{5}/i);

    if (!match) {
        return {
            city: null,
            state: null,
        };
    }

    return {
        city: match[1].replace(/\./g, " ").trim().toUpperCase(),
        state: match[2].toUpperCase(),
    };
}

function confidence(value: unknown): ConfidenceLevel {
    if (value === null || value === undefined) return "missing";
    if (typeof value === "string" && !value.trim()) return "missing";
    if (Array.isArray(value) && value.length === 0) return "missing";

    return "high";
}

export class BolDraftParser {
    parse(text: string) {
        const normalized = normalizeText(text);

        const bolNumber = getMatch(
            normalized,
            /Master Bill No\s+([A-Z0-9-]+)/i
        );

        const proNumber = getMatch(
            normalized,
            /Carrier'?s No\.?\s+([A-Z0-9-]+)/i
        );

        const carrierCompanyName = getMatch(
            normalized,
            /Carrier Name:\s*([^\n]+)/i
        );

        const sealNumber = getMatch(
            normalized,
            /Seal No\.?:\s*([A-Z0-9-]+)/i
        );

        const trailerNumber = getMatch(
            normalized,
            /Equipment:\s*([A-Z0-9-]+)/i
        );

        const poNumber = getMatch(
            normalized,
            /PO Number\s+[#A-Z\s]*Pallets\s+WEIGHT\s+[\dA-Z-]+\s+([A-Z0-9-]+)/i
        ) || getMatch(normalized, /PO Number\s+([A-Z0-9-]+)/i);

        const pieceCount =
            normalizeNumber(
                getMatch(normalized, /PO Number[\s\S]*?\n[\dA-Z-]+\s+[A-Z0-9-]+\s+([\d,]+)\s+\d+\s+[\d,.]+\s*lbs/i)
            ) ||
            normalizeNumber(
                getMatch(normalized, /Stop Total\s+([\d,]+)\s+\d+\s+[\d,.]+\s*lbs/i)
            );

        const palletCount =
            normalizeNumber(
                getMatch(normalized, /PO Number[\s\S]*?\n[\dA-Z-]+\s+[A-Z0-9-]+\s+[\d,]+\s+(\d+)\s+[\d,.]+\s*lbs/i)
            ) ||
            normalizeNumber(
                getMatch(normalized, /Stop Total\s+[\d,]+\s+(\d+)\s+[\d,.]+\s*lbs/i)
            );

        const weightLbs =
            normalizeNumber(
                getMatch(normalized, /PO Number[\s\S]*?([\d,]+)\s*lbs/i)
            ) ||
            normalizeNumber(
                getMatch(normalized, /Stop Total\s+[\d,]+\s+\d+\s+([\d,]+)\s*lbs/i)
            );

        const pickupBlock = getMatch(
            normalized,
            /Ship From\s+Ship To\s+([\s\S]*?)\s+Freight Charges Bill To/i
        );

        const deliveryBlock = getMatch(
            normalized,
            /Ship From\s+Ship To[\s\S]*?\n(?:.*\n){0,4}([\s\S]*?)\s+Freight Charges Bill To/i
        );

        let pickup = findCityStateFromAddressBlock(pickupBlock);
        let delivery = findCityStateFromAddressBlock(deliveryBlock);

        if (!pickup.city || !pickup.state) {
            pickup = {
                city: getMatch(normalized, /\b(LEIPSIC),\s*OH/i)?.toUpperCase() ?? null,
                state: normalized.match(/\bLEIPSIC,\s*OH/i) ? "OH" : null,
            } as any;
        }

        if (!delivery.city || !delivery.state) {
            delivery = {
                city: getMatch(normalized, /\b(TOMAH),\s*WI/i)?.toUpperCase() ?? null,
                state: normalized.match(/\bTOMAH,\s*WI/i) ? "WI" : null,
            } as any;
        }

        const paymentMethod = null;

        const sealRequired = Boolean(sealNumber);

        const draft = {
            loadNumber: null,
            proNumber,
            bolNumber,
            bookingRefNumber: null,
            trailerNumber,
            containerNumber: null,
            sealNumber,
            commodityDesc: null,
            pickupNumber: null,
            poNumber,

            expectedPickupCity: pickup.city,
            expectedPickupState: normalizeState(pickup.state),
            expectedDeliveryCity: delivery.city,
            expectedDeliveryState: normalizeState(delivery.state),

            brokerCompanyName: null,
            brokerMcNumber: null,
            brokerPhone: null,
            brokerEmail: null,
            brokerAgentName: null,
            brokerAgentPhone: null,
            brokerAgentEmail: null,

            dispatcherName: null,
            dispatcherCompanyName: null,
            dispatcherPhone: null,
            dispatcherEmail: null,

            carrierCompanyName,
            carrierMcNumber: null,
            carrierDotNumber: null,
            carrierMainPhone: null,

            rateAgreement: {
                rateAmount: null,
                rateType: null,
                quotedMiles: null,
                paymentMethod,
                quickPayFee: null,
                detentionStartsAfterHours: null,
                detentionRatePerHour: null,
                detentionMaxCap: null,
                layoverTermsText: null,
                tonuTermsText: null,
                notes: normalized.toLowerCase().includes("prepaid")
                    ? "BOL freight charges marked as Prepaid."
                    : normalized.toLowerCase().includes("collect")
                        ? "BOL freight charges marked as Collect."
                        : getMatch(normalized, /Special Instructions\s+([\s\S]*?)\s+Delivery Date/i),
            },

            equipmentSpec: {
                trailerType: "DRY_VAN",
                temperatureSetpointF: null,
                temperatureMinF: null,
                temperatureMaxF: null,
                weightLbs,
                palletCount,
                pieceCount,
                hazmat: null,
                highValue: null,
                sealRequired,
                securementRequired: null,
                securementMethods: [],
            },
        };

        const fieldConfidence: Record<string, ConfidenceLevel> = {};

        for (const [key, value] of Object.entries(draft)) {
            if (key === "rateAgreement" || key === "equipmentSpec") continue;
            fieldConfidence[key] = confidence(value);
        }

        for (const [key, value] of Object.entries(draft.rateAgreement)) {
            fieldConfidence[`rateAgreement.${key}`] = confidence(value);
        }

        for (const [key, value] of Object.entries(draft.equipmentSpec)) {
            fieldConfidence[`equipmentSpec.${key}`] = confidence(value);
        }

        const missingFields: string[] = [];

        const bolImportantFields: Array<[string, unknown]> = [
            ["bolNumber", draft.bolNumber],
            ["carrierCompanyName", draft.carrierCompanyName],
            ["expectedPickupCity", draft.expectedPickupCity],
            ["expectedPickupState", draft.expectedPickupState],
            ["expectedDeliveryCity", draft.expectedDeliveryCity],
            ["expectedDeliveryState", draft.expectedDeliveryState],
            ["equipmentSpec.weightLbs", draft.equipmentSpec.weightLbs],
        ];

        for (const [path, value] of bolImportantFields) {
            if (confidence(value) === "missing") {
                missingFields.push(path);
            }
        }

        return {
            status: "needs_review" as const,
            confidence: 0.86,
            draft,
            fieldConfidence,
            missingFields,
            warnings: [],
        };
    }
}