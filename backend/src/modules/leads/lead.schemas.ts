import { z } from "zod";
import { HAD_RESPONSE, LEAD_LEVEL, LEAD_STATUS } from "./lead.constants.js";

export const leadInputSchema = z.object({
  company: z.string().trim().min(2).max(180),
  city: z.string().trim().max(120).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  whatsapp: z.string().trim().max(40).nullable().optional(),
  email: z.string().trim().email().max(160).nullable().optional().or(z.literal("")),
  site: z.string().trim().url().max(220).nullable().optional().or(z.literal("")),
  maps_url: z.string().trim().url().max(350).nullable().optional().or(z.literal("")),
  decisor_name_role: z.string().trim().max(180).nullable().optional(),
  had_response: z.enum(HAD_RESPONSE).nullable().optional(),
  lead_level: z.enum(LEAD_LEVEL).nullable().optional(),
  status: z.enum(LEAD_STATUS),
  first_contact_date: z.string().date().nullable().optional(),
  followup_date_1: z.string().date().nullable().optional(),
  followup_date_2: z.string().date().nullable().optional(),
  followup_date_3: z.string().date().nullable().optional(),
  notes: z.string().max(4000).nullable().optional()
});

export const leadQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: z.enum(LEAD_STATUS).optional(),
  city: z.string().trim().max(120).optional(),
  lead_level: z.enum(LEAD_LEVEL).optional(),
  had_response: z.enum(HAD_RESPONSE).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10)
});

export const importOptionsSchema = z.object({
  skipDuplicates: z
    .union([z.boolean(), z.string()])
    .transform((v) => (typeof v === "string" ? v.toLowerCase() !== "false" : v))
    .default(true)
});

export type LeadInput = z.infer<typeof leadInputSchema>;
