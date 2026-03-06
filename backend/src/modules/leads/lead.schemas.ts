import { z } from "zod";
import { HAD_RESPONSE, LEAD_LEVEL, LEAD_STATUS, LEAD_TEMPERATURE } from "./lead.constants.js";

export const leadInputSchema = z.object({
  company: z.string().trim().max(180).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  whatsapp: z.string().trim().max(40).nullable().optional(),
  email: z.string().trim().email().max(160).nullable().optional().or(z.literal("")),
  site: z.string().trim().max(220).nullable().optional().or(z.literal("")),
  maps_url: z.string().trim().max(350).nullable().optional().or(z.literal("")),
  decisor_name_role: z.string().trim().max(180).nullable().optional(),
  had_response: z.enum(HAD_RESPONSE).nullable().optional(),
  lead_level: z.enum(LEAD_LEVEL).nullable().optional(),
  temperature: z.enum(LEAD_TEMPERATURE).nullable().optional(),
  status: z.enum(LEAD_STATUS).nullable().optional(),
  deal_value: z.coerce.number().min(0).nullable().optional(),
  closed_at: z.string().date().nullable().optional(),
  lost_reason: z.string().trim().max(240).nullable().optional(),
  next_action_date: z.string().date().nullable().optional(),
  next_action_note: z.string().trim().max(1000).nullable().optional(),
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
  responsible: z.string().trim().max(180).optional(),
  temperature: z.enum(LEAD_TEMPERATURE).optional(),
  imported_date: z.string().date().optional(),
  next_due_in_days: z.coerce.number().int().min(0).max(60).optional(),
  missing_phone: z
    .union([z.boolean(), z.string()])
    .transform((v) => (typeof v === "string" ? v === "true" : v))
    .optional(),
  missing_decisor: z
    .union([z.boolean(), z.string()])
    .transform((v) => (typeof v === "string" ? v === "true" : v))
    .optional(),
  missing_followup: z
    .union([z.boolean(), z.string()])
    .transform((v) => (typeof v === "string" ? v === "true" : v))
    .optional(),
  min_deal_value: z.coerce.number().min(0).optional(),
  max_deal_value: z.coerce.number().min(0).optional(),
  sort_by: z
    .enum([
      "lead_number",
      "company",
      "city",
      "status",
      "temperature",
      "created_at",
      "first_contact_date",
      "next_action_date",
      "deal_value"
    ])
    .optional(),
  sort_dir: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10)
});

export const importOptionsSchema = z.object({
  skipDuplicates: z
    .union([z.boolean(), z.string()])
    .transform((v) => (typeof v === "string" ? v.toLowerCase() !== "false" : v))
    .default(true),
  dryRun: z
    .union([z.boolean(), z.string()])
    .transform((v) => (typeof v === "string" ? v.toLowerCase() === "true" : v))
    .default(false),
  duplicateMode: z.enum(["skip", "update", "merge_empty", "allow"]).default("skip"),
  defaultResponsible: z.string().trim().max(180).optional(),
  defaultStatus: z.enum(LEAD_STATUS).optional(),
  defaultTemperature: z.enum(LEAD_TEMPERATURE).optional(),
  source: z.string().trim().max(120).optional(),
  campaign: z.string().trim().max(120).optional()
});

export const leadBulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200)
});

export const leadBulkUpdateSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  status: z.enum(LEAD_STATUS).optional(),
  temperature: z.enum(LEAD_TEMPERATURE).nullable().optional(),
  next_action_date: z.string().date().nullable().optional(),
  responsible: z.string().trim().max(180).nullable().optional()
});

export const leadExportSelectedSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500)
});

export type LeadInput = z.infer<typeof leadInputSchema>;
