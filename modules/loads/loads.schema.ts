import { z } from "zod";

export const CreateLoadSchema = z.object({
  driverOperatingAs: z.enum([
    "OWNER_OPERATOR_OWN_AUTHORITY",
    "COMPANY_DRIVER_UNDER_AUTHORITY",
    "LEASED_ON_UNDER_COMPANY_AUTHORITY",
  ]),
  // Load identity (core)
  loadNumber: z.string().min(1),
  proNumber: z.string().optional(),
  bolNumber: z.string().optional(),
  bookingRefNumber: z.string().optional(),
  trailerNumber: z.string().optional(),
  containerNumber: z.string().optional(),
  sealNumber: z.string().optional(),
  commodityDesc: z.string().optional(),

  // References & IDs (tier 2)
  pickupNumber: z.string().optional(),
  poNumber: z.string().optional(),

  // Type/mode/status
  loadType: z.enum(["DRY_VAN", "REEFER", "FLATBED", "STEPDECK", "POWER_ONLY", "OTHER"]),
  mode: z.enum(["LIVE_LIVE", "LIVE_DROP", "DROP_LIVE", "DROP_DROP"]).default("LIVE_LIVE"),
  status: z.enum(["PRE_TRIP", "ACTIVE", "DRIVING", "DELIVERED", "CANCELLED"]).default("PRE_TRIP"),

  // Timeline & Geo context
  createdTimeZone: z.string().optional(),
  createdLatitude: z.number().optional(), // Ou z.string() se preferir tratar o Decimal do Prisma como string
  createdLongitude: z.number().optional(),

  // Quick listing helpers
  expectedPickupCity: z.string().optional(),
  expectedPickupState: z.string().optional(),
  expectedDeliveryCity: z.string().optional(),
  expectedDeliveryState: z.string().optional(),

  // Parties snapshot (Broker)
  brokerCompanyName: z.string().min(1),
  brokerMcNumber: z.string().optional(),
  brokerPhone: z.string().optional(),
  brokerEmail: z.string().optional(),
  brokerAgentName: z.string().optional(),
  brokerAgentPhone: z.string().optional(),
  brokerAgentEmail: z.string().optional(),

  // Parties snapshot (Dispatcher)
  dispatcherName: z.string().optional(),
  dispatcherCompanyName: z.string().optional(),
  dispatcherPhone: z.string().optional(),
  dispatcherEmail: z.string().optional(),

  // Parties snapshot (Carrier)
  carrierCompanyName: z.string().optional(),
  carrierMcNumber: z.string().optional(),
  carrierDotNumber: z.string().optional(),
  carrierMainPhone: z.string().optional(),

  rateAgreement: z.object({
    rateAmount: z.number(),
    rateType: z.enum(["FLAT", "PER_MILE", "OTHER"]),
    quotedMiles: z.number().optional(),
    paymentMethod: z.enum(["FACTORING", "QUICK_PAY", "STANDARD"]).default("STANDARD"),
    quickPayFee: z.number().min(0).nullable().optional(),
    detentionStartsAfterHours: z.number().int().positive().nullable().optional(),
    // Para Decimais, geralmente validamos como number ou coercemos
    detentionRatePerHour: z.number().min(0).nullable().optional(),
    detentionMaxCap: z.number().min(0).nullable().optional(),
    layoverTermsText: z.string().nullable().optional(),
    tonuTermsText: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  }),

  equipmentSpec: z.object({
    trailerType: z.enum(["DRY_VAN", "REEFER", "FLATBED", "STEPDECK", "POWER_ONLY", "OTHER"]),
    // Temperaturas (Decimal 6,2 no DB)
    temperatureSetpointF: z.coerce.number().nullable().optional(),
    temperatureMinF: z.coerce.number().nullable().optional(),
    temperatureMaxF: z.coerce.number().nullable().optional(),
    // Carga e Quantidade
    weightLbs: z.coerce.number().min(0).nullable().optional(),
    palletCount: z.number().int().min(0).nullable().optional(),
    pieceCount: z.number().int().min(0).nullable().optional(),
    // Flags (Booleanos com default)
    hazmat: z.boolean().default(false),
    highValue: z.boolean().default(false),
    sealRequired: z.boolean().default(false),
    // Securement
    securementRequired: z.boolean().default(false),
    securementMethods: z.array(z.string()).default([]),
  })
});

export const ListLoadsSchema = z.object({
  status: z.enum(["PRE_TRIP", "DRIVING", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
  q: z.string().optional(), // busca por loadNumber etc.
});
