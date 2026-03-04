import { PoolClient } from "pg";
import { LeadInput } from "./lead.schemas.js";
import { formatBrazilianPhone, normalizeDigits, normalizeString } from "../../lib/utils.js";

export async function nextLeadNumber(
  client: PoolClient,
  organizationId: string,
  userId: string
): Promise<number> {
  const result = await client.query(
    `INSERT INTO lead_counters (organization_id, user_id, current_value)
     VALUES ($1, $2, 1)
     ON CONFLICT (organization_id, user_id)
     DO UPDATE SET current_value = lead_counters.current_value + 1, updated_at = NOW()
     RETURNING current_value`,
    [organizationId, userId]
  );

  return Number(result.rows[0].current_value);
}

export function normalizeLeadInput(input: LeadInput) {
  const phoneDigits = normalizeDigits(input.phone ?? null);
  const whatsappDigits = normalizeDigits(input.whatsapp ?? null);

  return {
    company: input.company.trim(),
    city: normalizeString(input.city),
    phone: formatBrazilianPhone(phoneDigits),
    phone_digits: phoneDigits,
    whatsapp: formatBrazilianPhone(whatsappDigits),
    whatsapp_digits: whatsappDigits,
    email: normalizeString(input.email ?? null)?.toLowerCase() ?? null,
    site: normalizeString(input.site ?? null),
    maps_url: normalizeString(input.maps_url ?? null),
    decisor_name_role: normalizeString(input.decisor_name_role),
    had_response: input.had_response ?? null,
    lead_level: input.lead_level ?? null,
    status: input.status,
    first_contact_date: input.first_contact_date ?? null,
    followup_date_1: input.followup_date_1 ?? null,
    followup_date_2: input.followup_date_2 ?? null,
    followup_date_3: input.followup_date_3 ?? null,
    notes: normalizeString(input.notes)
  };
}
