import { PoolClient } from "pg";
import { LeadInput } from "./lead.schemas.js";
import {
  formatBrazilianPhone,
  normalizeDigits,
  normalizeOptionalHttpUrl,
  normalizeString
} from "../../lib/utils.js";

export async function nextLeadNumber(
  client: PoolClient,
  organizationId: string,
  userId: string
): Promise<number> {
  // Prevent duplicated lead numbers for concurrent inserts in the same tenant/user.
  await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [
    `lead-counter:${organizationId}:${userId}`
  ]);

  const maxResult = await client.query(
    `SELECT COALESCE(MAX(lead_number), 0)::int AS max_number
     FROM leads
     WHERE organization_id = $1
       AND owner_user_id = $2`,
    [organizationId, userId]
  );

  const nextValue = Number(maxResult.rows[0]?.max_number ?? 0) + 1;

  const result = await client.query(
    `INSERT INTO lead_counters (organization_id, user_id, current_value)
     VALUES ($1, $2, $3)
     ON CONFLICT (organization_id, user_id)
     DO UPDATE SET current_value = EXCLUDED.current_value, updated_at = NOW()
     RETURNING current_value`,
    [organizationId, userId, nextValue]
  );

  return Number(result.rows[0].current_value);
}

export function normalizeLeadInput(input: LeadInput) {
  const phoneDigits = normalizeDigits(input.phone ?? null);
  const whatsappDigits = normalizeDigits(input.whatsapp ?? null);

  return {
    company: normalizeString(input.company),
    city: normalizeString(input.city),
    phone: formatBrazilianPhone(phoneDigits),
    phone_digits: phoneDigits,
    whatsapp: formatBrazilianPhone(whatsappDigits),
    whatsapp_digits: whatsappDigits,
    email: normalizeString(input.email ?? null)?.toLowerCase() ?? null,
    site: normalizeOptionalHttpUrl(input.site ?? null),
    maps_url: normalizeOptionalHttpUrl(input.maps_url ?? null),
    decisor_name_role: normalizeString(input.decisor_name_role),
    had_response: input.had_response ?? null,
    lead_level: input.lead_level ?? null,
    temperature: input.temperature ?? null,
    status: input.status ?? "lead_novo",
    deal_value: input.deal_value ?? null,
    closed_at: input.closed_at ?? null,
    lost_reason: normalizeString(input.lost_reason),
    next_action_date: input.next_action_date ?? null,
    next_action_note: normalizeString(input.next_action_note),
    first_contact_date: input.first_contact_date ?? null,
    followup_date_1: input.followup_date_1 ?? null,
    followup_date_2: input.followup_date_2 ?? null,
    followup_date_3: input.followup_date_3 ?? null,
    notes: normalizeString(input.notes)
  };
}
