import { z } from "zod";

export const CreateLoadSchema = z.object({
  driverOperatingAs: z.enum([
    "OWNER_OPERATOR_OWN_AUTHORITY",
    "COMPANY_DRIVER_UNDER_AUTHORITY",
    "LEASED_ON_UNDER_COMPANY_AUTHORITY",
  ]),
  loadNumber: z.string().min(1),
  loadType: z.enum(["DRY_VAN", "REEFER", "FLATBED", "STEPDECK", "POWER_ONLY", "OTHER"]),
  mode: z.enum(["LIVE_LIVE", "LIVE_DROP", "DROP_LIVE", "DROP_DROP"]).default("LIVE_LIVE"),

  brokerCompanyName: z.string().min(1),
  brokerMcNumber: z.string().optional(),
  brokerPhone: z.string().optional(),
  brokerEmail: z.string().optional(),
  brokerAgentName: z.string().optional(),
  brokerAgentPhone: z.string().optional(),
  brokerAgentEmail: z.string().optional(),

  dispatcherName: z.string().optional(),
  dispatcherCompanyName: z.string().optional(),
  dispatcherPhone: z.string().optional(),
  dispatcherEmail: z.string().optional(),

  carrierCompanyName: z.string().optional(),
  carrierMcNumber: z.string().optional(),
  carrierDotNumber: z.string().optional(),
  carrierMainPhone: z.string().optional(),
});

export const ListLoadsSchema = z.object({
  status: z.enum(["PRE_TRIP", "DRIVING", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
  q: z.string().optional(), // busca por loadNumber etc.
});
