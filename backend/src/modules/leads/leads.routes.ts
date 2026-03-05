import { parse } from "csv-parse/sync";
import { extname } from "node:path";
import { FastifyInstance } from "fastify";
import * as XLSX from "xlsx";
import { z } from "zod";
import { AppError } from "../../lib/errors.js";
import {
  formatBrazilianPhone,
  normalizeDigits,
  normalizeString,
  parseCsvDate
} from "../../lib/utils.js";
import { HAD_RESPONSE, LEAD_LEVEL, LEAD_STATUS } from "./lead.constants.js";
import {
  importOptionsSchema,
  leadBulkDeleteSchema,
  leadExportSelectedSchema,
  leadBulkUpdateSchema,
  leadInputSchema,
  leadQuerySchema
} from "./lead.schemas.js";
import { nextLeadNumber, normalizeLeadInput } from "./lead.service.js";

const CSV_MAP = {
  leadNumber: "Lead #",
  company: "Empresa",
  city: "Cidade",
  phone: "Telefone",
  whatsapp: "WhatsApp",
  email: "Email",
  site: "Site",
  mapsUrl: "Link Google Maps",
  decisor: "Decisor",
  status: "Status do Contato",
  firstContactDate: "Data Primeiro Contato",
  followup1: "Follow-up 1",
  followup2: "Follow-up 2",
  followup3: "Follow-up 3",
  notes: "ObservaÃ§Ãµes",
  hadResponse: "Teve resposta",
  leadLevel: "NÃ­vel do lead"
} as const;

const statusMap: Record<string, (typeof LEAD_STATUS)[number]> = {
  "lead novo": "lead_novo",
  "em contato": "em_contato",
  "reuniÃ£o marcada": "reuniao_marcada",
  "reuniao marcada": "reuniao_marcada",
  "proposta enviada": "proposta_enviada",
  fechado: "fechado",
  perdido: "perdido"
};

const hadResponseMap: Record<string, (typeof HAD_RESPONSE)[number]> = {
  sim: "sim",
  nao: "nao"
};

const leadLevelMap: Record<string, (typeof LEAD_LEVEL)[number]> = {
  "com interesse": "com_interesse",
  "sem interesse": "sem_interesse",
  "nÃ£o respondeu": "nao_respondeu",
  "nao respondeu": "nao_respondeu"
};

const exportCsvSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  city: z.string().optional(),
  lead_level: z.string().optional(),
  had_response: z.string().optional()
});

const normalizeHeader = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const HEADER_ALIASES: Record<keyof typeof CSV_MAP, string[]> = {
  leadNumber: ["lead #", "lead", "numero lead", "n lead"],
  company: ["empresa", "company", "clinica", "nome empresa"],
  city: ["cidade", "city", "municipio"],
  phone: ["telefone", "phone", "telefone fixo"],
  whatsapp: ["whatsapp", "whats", "zap"],
  email: ["email", "e-mail", "mail"],
  site: [
    "site",
    "website",
    "url site",
    "url do site",
    "link do site",
    "link site",
    "pagina web",
    "homepage",
    "home page",
    "dominio",
    "site/instagram",
    "website/instagram"
  ],
  mapsUrl: ["link google maps", "google maps", "maps", "maps url"],
  decisor: ["decisor", "decisor nome/cargo", "contato decisor", "responsavel"],
  status: ["status do contato", "status", "etapa"],
  firstContactDate: ["data primeiro contato", "primeiro contato", "data contato"],
  followup1: ["follow-up 1", "follow up 1", "fallow up 1"],
  followup2: ["follow-up 2", "follow up 2", "fallow up 2"],
  followup3: ["follow-up 3", "follow up 3", "fallow up 3"],
  notes: ["observacoes", "observaÃ§Ã£o", "observacoes gerais", "notas"],
  hadResponse: ["teve resposta", "respondeu", "houve resposta"],
  leadLevel: ["nivel do lead", "nÃ­vel do lead", "lead level", "nivel"]
};

const buildHeaderAliasIndex = (): Record<string, keyof typeof CSV_MAP> => {
  const index: Record<string, keyof typeof CSV_MAP> = {};
  (Object.keys(HEADER_ALIASES) as Array<keyof typeof CSV_MAP>).forEach((key) => {
    HEADER_ALIASES[key].forEach((alias) => {
      index[normalizeHeader(alias)] = key;
    });
  });
  return index;
};

const HEADER_ALIAS_INDEX = buildHeaderAliasIndex();

const normalizeRecordHeaders = (record: Record<string, string>): Record<string, string> => {
  const normalized: Record<string, string> = {};

  for (const [rawKey, rawValue] of Object.entries(record)) {
    const normalizedKey = normalizeHeader(rawKey);
    let mappedKey = HEADER_ALIAS_INDEX[normalizedKey];
    if (!mappedKey) {
      // Fallbacks for user-provided spreadsheets with non-standard headers.
      if (
        normalizedKey.includes("google maps") ||
        normalizedKey.includes("maps") ||
        normalizedKey.includes("mapa")
      ) {
        mappedKey = "mapsUrl";
      } else if (
        normalizedKey === "url" ||
        normalizedKey.includes("site") ||
        normalizedKey.includes("website") ||
        normalizedKey.includes("dominio")
      ) {
        mappedKey = "site";
      }
    }
    if (!mappedKey) continue;
    normalized[CSV_MAP[mappedKey]] = rawValue;
  }

  return normalized;
};

const detectCsvDelimiter = (content: string): "," | ";" | "\t" => {
  const firstLine = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstLine) return ",";

  const candidates: Array<"," | ";" | "\t"> = [",", ";", "\t"];
  let best: "," | ";" | "\t" = ",";
  let bestScore = -1;

  for (const delimiter of candidates) {
    const score = firstLine.split(delimiter).length;
    if (score > bestScore) {
      best = delimiter;
      bestScore = score;
    }
  }

  return best;
};

const MINIMAL_CSV_HEADERS = [
  CSV_MAP.company,
  CSV_MAP.city,
  CSV_MAP.phone,
  CSV_MAP.whatsapp,
  CSV_MAP.email,
  CSV_MAP.site,
  CSV_MAP.mapsUrl,
  CSV_MAP.decisor
] as const;

const hasRequiredCsvHeaders = (records: Record<string, string>[]): boolean => {
  const firstRecord = records[0];
  if (!firstRecord) return false;
  const headerKeys = Object.keys(firstRecord);
  return MINIMAL_CSV_HEADERS.some((header) => headerKeys.includes(header));
};

const parseUploadRecords = (
  fileName: string,
  buffer: Buffer
): { records: Record<string, string>[]; source: "csv" | "xlsx" } => {
  const extension = extname(fileName).toLowerCase();

  if (extension === ".xlsx" || extension === ".xls") {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];
    const firstSheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined;
    if (!firstSheet) {
      return { records: [], source: "xlsx" };
    }

    const records = XLSX.utils.sheet_to_json<Record<string, string>>(firstSheet, {
      defval: "",
      raw: false
    });
    return { records: records.map(normalizeRecordHeaders), source: "xlsx" };
  }

  const content = buffer.toString("utf-8");
  const delimiter = detectCsvDelimiter(content);
  const records = parse(content, {
    columns: true,
    delimiter,
    bom: true,
    skip_empty_lines: true,
    trim: true
  }) as Record<string, string>[];

  return { records: records.map(normalizeRecordHeaders), source: "csv" };
};

const isValidEmail = (value: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

const ensureAdmin = async (app: FastifyInstance, userId: string) => {
  const result = await app.db.query(
    `SELECT role
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId]
  );
  const role = (result.rows[0]?.role as string | undefined) ?? "admin";
  if (role !== "admin") {
    throw new AppError("Sem permissao para esta acao", 403);
  }
};

const extractEmailFromField = (rawValue: string | null | undefined): string | null => {
  const normalized = normalizeString(rawValue);
  if (!normalized) return null;

  const text = normalized.toLowerCase();
  const match = text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  if (!match) return null;

  const candidate = match[0].trim();
  return isValidEmail(candidate) ? candidate : null;
};

type ParsedPhoneField = {
  phones: string[];
  invalidReason: string | null;
};

const parsePhoneField = (
  rawValue: string | null | undefined,
  fieldLabel: "Telefone" | "WhatsApp"
): ParsedPhoneField => {
  if (!rawValue) return { phones: [], invalidReason: null };

  const parts = rawValue
    .split(/(?:\/|;|\||,|\be\b|\bou\b)/gi)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  const formatted: string[] = [];
  let hadDigits = false;
  let invalidChunk = false;

  for (const part of parts) {
    let digits = normalizeDigits(part);
    if (!digits) continue;
    hadDigits = true;

    if (digits.startsWith("55") && digits.length > 11) {
      digits = digits.slice(2);
    }

    if (digits.length < 10 || digits.length > 11) {
      invalidChunk = true;
      continue;
    }

    const phone = formatBrazilianPhone(digits);
    if (phone && !formatted.includes(phone)) {
      formatted.push(phone);
    }
  }

  if (formatted.length > 2) {
    return {
      phones: [],
      invalidReason: `${fieldLabel} invalido: quantidade de numeros maior que o normal na mesma celula.`
    };
  }

  if (hadDigits && (formatted.length === 0 || invalidChunk)) {
    return {
      phones: [],
      invalidReason: `${fieldLabel} invalido: formato de numero fora do padrao (use 10 ou 11 digitos).`
    };
  }

  return { phones: formatted, invalidReason: null };
};

export async function leadsRoutes(app: FastifyInstance) {
  app.get(
    "/api/leads/funnel-summary",
    {
      preHandler: [app.authenticate]
    },
    async (request) => {
      const query = leadQuerySchema.parse(request.query);
      const conditions: string[] = ["organization_id = $1"];
      const values: Array<string | number> = [request.user.organizationId];

      if (query.search) {
        values.push(`%${query.search}%`);
        conditions.push(
          `(company ILIKE $${values.length} OR email ILIKE $${values.length} OR phone_digits ILIKE $${values.length})`
        );
      }

      if (query.city) {
        values.push(query.city);
        conditions.push(`city = $${values.length}`);
      }

      if (query.lead_level) {
        values.push(query.lead_level);
        conditions.push(`lead_level = $${values.length}`);
      }

      if (query.had_response) {
        values.push(query.had_response);
        conditions.push(`had_response = $${values.length}`);
      }

      if (query.responsible) {
        values.push(`%${query.responsible}%`);
        conditions.push(`decisor_name_role ILIKE $${values.length}`);
      }

      if (query.temperature) {
        values.push(query.temperature);
        conditions.push(`temperature = $${values.length}`);
      }

      if (query.imported_date) {
        values.push(query.imported_date);
        conditions.push(`created_at::date = $${values.length}::date`);
      }

      if (query.next_due_in_days !== undefined) {
        values.push(query.next_due_in_days);
        conditions.push(
          `COALESCE(next_action_date, followup_date_1, followup_date_2, followup_date_3) BETWEEN CURRENT_DATE AND CURRENT_DATE + $${values.length}::int`
        );
        conditions.push(`status NOT IN ('fechado', 'perdido')`);
      }

      if (query.missing_phone) {
        conditions.push(`(phone IS NULL OR phone = '')`);
      }

      if (query.missing_decisor) {
        conditions.push(`(decisor_name_role IS NULL OR decisor_name_role = '')`);
      }

      if (query.missing_followup) {
        conditions.push(
          `(next_action_date IS NULL AND followup_date_1 IS NULL AND followup_date_2 IS NULL AND followup_date_3 IS NULL)`
        );
      }

      if (query.min_deal_value !== undefined) {
        values.push(query.min_deal_value);
        conditions.push(`COALESCE(deal_value, 0) >= $${values.length}`);
      }

      if (query.max_deal_value !== undefined) {
        values.push(query.max_deal_value);
        conditions.push(`COALESCE(deal_value, 0) <= $${values.length}`);
      }

      const result = await app.db.query(
        `SELECT status, COUNT(*)::int AS count, COALESCE(SUM(deal_value), 0)::numeric AS total_value
         FROM leads
         WHERE ${conditions.join(" AND ")}
         GROUP BY status`,
        values
      );

      const byStatus = new Map<
        string,
        {
          count: number;
          total_value: number;
        }
      >();

      for (const row of result.rows) {
        byStatus.set(row.status as string, {
          count: Number(row.count ?? 0),
          total_value: Number(row.total_value ?? 0)
        });
      }

      return {
        items: LEAD_STATUS.map((status) => ({
          status,
          count: byStatus.get(status)?.count ?? 0,
          total_value: byStatus.get(status)?.total_value ?? 0
        }))
      };
    }
  );

  app.get(
    "/api/leads",
    {
      preHandler: [app.authenticate]
    },
    async (request) => {
      const query = leadQuerySchema.parse(request.query);
      const offset = (query.page - 1) * query.pageSize;
      const conditions: string[] = ["organization_id = $1"];
      const values: Array<string | number> = [request.user.organizationId];

      if (query.search) {
        values.push(`%${query.search}%`);
        conditions.push(`(company ILIKE $${values.length} OR email ILIKE $${values.length} OR phone_digits ILIKE $${values.length})`);
      }

      if (query.status) {
        values.push(query.status);
        conditions.push(`status = $${values.length}`);
      }

      if (query.city) {
        values.push(query.city);
        conditions.push(`city = $${values.length}`);
      }

      if (query.lead_level) {
        values.push(query.lead_level);
        conditions.push(`lead_level = $${values.length}`);
      }

      if (query.had_response) {
        values.push(query.had_response);
        conditions.push(`had_response = $${values.length}`);
      }

      if (query.responsible) {
        values.push(`%${query.responsible}%`);
        conditions.push(`decisor_name_role ILIKE $${values.length}`);
      }

      if (query.temperature) {
        values.push(query.temperature);
        conditions.push(`temperature = $${values.length}`);
      }

      if (query.imported_date) {
        values.push(query.imported_date);
        conditions.push(`created_at::date = $${values.length}::date`);
      }

      if (query.next_due_in_days !== undefined) {
        values.push(query.next_due_in_days);
        conditions.push(
          `COALESCE(next_action_date, followup_date_1, followup_date_2, followup_date_3) BETWEEN CURRENT_DATE AND CURRENT_DATE + $${values.length}::int`
        );
        conditions.push(`status NOT IN ('fechado', 'perdido')`);
      }

      if (query.missing_phone) {
        conditions.push(`(phone IS NULL OR phone = '')`);
      }

      if (query.missing_decisor) {
        conditions.push(`(decisor_name_role IS NULL OR decisor_name_role = '')`);
      }

      if (query.missing_followup) {
        conditions.push(
          `(next_action_date IS NULL AND followup_date_1 IS NULL AND followup_date_2 IS NULL AND followup_date_3 IS NULL)`
        );
      }

      if (query.min_deal_value !== undefined) {
        values.push(query.min_deal_value);
        conditions.push(`COALESCE(deal_value, 0) >= $${values.length}`);
      }

      if (query.max_deal_value !== undefined) {
        values.push(query.max_deal_value);
        conditions.push(`COALESCE(deal_value, 0) <= $${values.length}`);
      }

      const whereClause = conditions.join(" AND ");
      const sortMap: Record<string, string> = {
        lead_number: "lead_number",
        company: "company",
        city: "city",
        status: "status",
        temperature: "temperature",
        created_at: "created_at",
        first_contact_date: "first_contact_date",
        next_action_date: "next_action_date",
        deal_value: "deal_value"
      };
      const sortColumn = sortMap[query.sort_by ?? "lead_number"] ?? "lead_number";
      const sortDir = query.sort_dir === "desc" ? "DESC" : "ASC";

      const listValues = [...values, query.pageSize, offset];
      const listQuery = `
        SELECT *
        FROM leads
        WHERE ${whereClause}
        ORDER BY ${sortColumn} ${sortDir} NULLS LAST, lead_number ASC
        LIMIT $${listValues.length - 1}
        OFFSET $${listValues.length}
      `;

      const countQuery = `SELECT COUNT(*)::int AS total FROM leads WHERE ${whereClause}`;

      const [listResult, countResult] = await Promise.all([
        app.db.query(listQuery, listValues),
        app.db.query(countQuery, values)
      ]);

      return {
        items: listResult.rows,
        meta: {
          page: query.page,
          pageSize: query.pageSize,
          total: countResult.rows[0].total
        }
      };
    }
  );

  app.get(
    "/api/leads/export.csv",
    {
      preHandler: [app.authenticate]
    },
    async (request, reply) => {
      const query = exportCsvSchema.parse(request.query);
      const rows = await app.db.query(
        `SELECT lead_number, company, city, phone, whatsapp, email, site, maps_url,
                decisor_name_role, status, first_contact_date, followup_date_1,
                followup_date_2, followup_date_3, notes, had_response, lead_level
         FROM leads
         WHERE organization_id = $1
         ORDER BY lead_number ASC`,
        [request.user.organizationId]
      );

      const headers = [
        "Lead #",
        "Empresa",
        "Cidade",
        "Telefone",
        "WhatsApp",
        "Email",
        "Site",
        "Link Google Maps",
        "Decisor",
        "Status do Contato",
        "Data Primeiro Contato",
        "Follow-up 1",
        "Follow-up 2",
        "Follow-up 3",
        "ObservaÃ§Ãµes",
        "Teve resposta",
        "NÃ­vel do lead"
      ];

      const escape = (value: unknown) => {
        if (value === null || value === undefined) return "";
        const content = String(value).replace(/"/g, '""');
        return `"${content}"`;
      };

      const dataLines = rows.rows.map((row) =>
        [
          row.lead_number,
          row.company,
          row.city,
          row.phone,
          row.whatsapp,
          row.email,
          row.site,
          row.maps_url,
          row.decisor_name_role,
          row.status,
          row.first_contact_date,
          row.followup_date_1,
          row.followup_date_2,
          row.followup_date_3,
          row.notes,
          row.had_response,
          row.lead_level
        ]
          .map(escape)
          .join(",")
      );

      const csv = [headers.join(","), ...dataLines].join("\n");

      return reply
        .header("Content-Type", "text/csv; charset=utf-8")
        .header("Content-Disposition", "attachment; filename=leads.csv")
        .send(csv);
    }
  );

  app.post(
    "/api/leads/export-selected.csv",
    {
      preHandler: [app.authenticate]
    },
    async (request, reply) => {
      const payload = leadExportSelectedSchema.parse(request.body);
      const rows = await app.db.query(
        `SELECT lead_number, company, city, phone, whatsapp, email, site, maps_url,
                decisor_name_role, status, first_contact_date, followup_date_1,
                followup_date_2, followup_date_3, notes, had_response, lead_level
         FROM leads
         WHERE organization_id = $1
           AND id = ANY($2::uuid[])
         ORDER BY lead_number ASC`,
        [request.user.organizationId, payload.ids]
      );

      const headers = [
        "Lead #",
        "Empresa",
        "Cidade",
        "Telefone",
        "WhatsApp",
        "Email",
        "Site",
        "Link Google Maps",
        "Decisor",
        "Status do Contato",
        "Data Primeiro Contato",
        "Follow-up 1",
        "Follow-up 2",
        "Follow-up 3",
        "Observacoes",
        "Teve resposta",
        "Nivel do lead"
      ];
      const escape = (value: unknown) => {
        if (value === null || value === undefined) return "";
        const content = String(value).replace(/"/g, '""');
        return `"${content}"`;
      };
      const dataLines = rows.rows.map((row) =>
        [
          row.lead_number,
          row.company,
          row.city,
          row.phone,
          row.whatsapp,
          row.email,
          row.site,
          row.maps_url,
          row.decisor_name_role,
          row.status,
          row.first_contact_date,
          row.followup_date_1,
          row.followup_date_2,
          row.followup_date_3,
          row.notes,
          row.had_response,
          row.lead_level
        ]
          .map(escape)
          .join(",")
      );
      const csv = [headers.join(","), ...dataLines].join("\n");
      return reply
        .header("Content-Type", "text/csv; charset=utf-8")
        .header("Content-Disposition", "attachment; filename=leads-selecionados.csv")
        .send(csv);
    }
  );

  app.post(
    "/api/leads",
    {
      preHandler: [app.authenticate]
    },
    async (request, reply) => {
      const payload = leadInputSchema.parse(request.body);
      const normalized = normalizeLeadInput(payload);

      const client = await app.db.connect();
      try {
        await client.query("BEGIN");
        const leadNumber = await nextLeadNumber(client, request.user.organizationId, request.user.sub);

        const created = await client.query(
          `INSERT INTO leads (
            organization_id, owner_user_id, lead_number, company, city, phone, phone_digits,
            whatsapp, whatsapp_digits, email, site, maps_url, decisor_name_role,
            had_response, lead_level, temperature, status, deal_value, closed_at, lost_reason,
            next_action_date, next_action_note, first_contact_date, followup_date_1, followup_date_2,
            followup_date_3, notes
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
            $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
          ) RETURNING *`,
          [
            request.user.organizationId,
            request.user.sub,
            leadNumber,
            normalized.company,
            normalized.city,
            normalized.phone,
            normalized.phone_digits,
            normalized.whatsapp,
            normalized.whatsapp_digits,
            normalized.email,
            normalized.site,
            normalized.maps_url,
            normalized.decisor_name_role,
            normalized.had_response,
            normalized.lead_level,
            normalized.temperature,
            normalized.status,
            normalized.deal_value,
            normalized.closed_at,
            normalized.lost_reason,
            normalized.next_action_date,
            normalized.next_action_note,
            normalized.first_contact_date,
            normalized.followup_date_1,
            normalized.followup_date_2,
            normalized.followup_date_3,
            normalized.notes
          ]
        );

        await client.query(
          `INSERT INTO lead_activity (organization_id, lead_id, actor_user_id, action, details)
           VALUES ($1, $2, $3, 'created', $4::jsonb)`,
          [request.user.organizationId, created.rows[0].id, request.user.sub, JSON.stringify({ source: "manual" })]
        );

        await client.query("COMMIT");
        return reply.code(201).send(created.rows[0]);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
  );

  app.get(
    "/api/leads/:id",
    {
      preHandler: [app.authenticate]
    },
    async (request) => {
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const result = await app.db.query(
        `SELECT *
         FROM leads
         WHERE id = $1
           AND organization_id = $2
         LIMIT 1`,
        [params.id, request.user.organizationId]
      );

      if (!result.rowCount) {
        throw new AppError("Lead nÃ£o encontrado", 404);
      }

      return result.rows[0];
    }
  );

  app.get(
    "/api/leads/:id/activity",
    {
      preHandler: [app.authenticate]
    },
    async (request) => {
      const params = z.object({ id: z.string().uuid() }).parse(request.params);

      const result = await app.db.query(
        `SELECT
           a.id,
           a.action,
           a.details,
           a.created_at,
           u.name AS actor_name
         FROM lead_activity a
         LEFT JOIN users u ON u.id = a.actor_user_id
         WHERE a.organization_id = $1
           AND a.lead_id = $2
         ORDER BY a.created_at DESC
         LIMIT 80`,
        [request.user.organizationId, params.id]
      );

      return { items: result.rows };
    }
  );

  app.post(
    "/api/leads/:id/activity-note",
    {
      preHandler: [app.authenticate]
    },
    async (request) => {
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const payload = z
        .object({
          note: z.string().trim().min(1).max(2000),
          attachment: z
            .object({
              name: z.string().trim().min(1).max(220),
              data_url: z.string().trim().max(3_000_000)
            })
            .nullable()
            .optional()
        })
        .parse(request.body);

      const existing = await app.db.query(
        `SELECT id
         FROM leads
         WHERE id = $1
           AND organization_id = $2
         LIMIT 1`,
        [params.id, request.user.organizationId]
      );

      if (!existing.rowCount) {
        throw new AppError("Lead nÃ£o encontrado", 404);
      }

      await app.db.query(
        `INSERT INTO lead_activity (organization_id, lead_id, actor_user_id, action, details)
         VALUES ($1, $2, $3, 'note', $4::jsonb)`,
        [
          request.user.organizationId,
          params.id,
          request.user.sub,
          JSON.stringify({
            note: payload.note,
            attachment: payload.attachment ?? null
          })
        ]
      );

      return { message: "Nota adicionada" };
    }
  );

  app.put(
    "/api/leads/:id",
    {
      preHandler: [app.authenticate]
    },
    async (request) => {
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const payload = leadInputSchema.parse(request.body);
      const normalized = normalizeLeadInput(payload);

      const existing = await app.db.query(
        `SELECT *
         FROM leads
         WHERE id = $1
           AND organization_id = $2
         LIMIT 1`,
        [params.id, request.user.organizationId]
      );

      if (!existing.rowCount) {
        throw new AppError("Lead nÃ£o encontrado", 404);
      }

      const current = existing.rows[0] as Record<string, any>;
      const changedFields: Array<{ field: string; from: string; to: string }> = [];
      const trackChange = (field: string, next: unknown) => {
        const before = current[field];
        const beforeNorm = before == null ? "" : String(before);
        const nextNorm = next == null ? "" : String(next);
        if (beforeNorm !== nextNorm) {
          changedFields.push({
            field,
            from: beforeNorm || "-",
            to: nextNorm || "-"
          });
        }
      };

      trackChange("company", normalized.company);
      trackChange("city", normalized.city);
      trackChange("phone", normalized.phone);
      trackChange("whatsapp", normalized.whatsapp);
      trackChange("email", normalized.email);
      trackChange("site", normalized.site);
      trackChange("maps_url", normalized.maps_url);
      trackChange("decisor_name_role", normalized.decisor_name_role);
      trackChange("had_response", normalized.had_response);
      trackChange("lead_level", normalized.lead_level);
      trackChange("temperature", normalized.temperature);
      trackChange("status", normalized.status);
      trackChange("deal_value", normalized.deal_value);
      trackChange("closed_at", normalized.closed_at);
      trackChange("lost_reason", normalized.lost_reason);
      trackChange("next_action_date", normalized.next_action_date);
      trackChange("next_action_note", normalized.next_action_note);
      trackChange("first_contact_date", normalized.first_contact_date);
      trackChange("followup_date_1", normalized.followup_date_1);
      trackChange("followup_date_2", normalized.followup_date_2);
      trackChange("followup_date_3", normalized.followup_date_3);
      trackChange("notes", normalized.notes);

      const result = await app.db.query(
        `UPDATE leads
         SET company = $1,
             city = $2,
             phone = $3,
             phone_digits = $4,
             whatsapp = $5,
             whatsapp_digits = $6,
             email = $7,
             site = $8,
             maps_url = $9,
             decisor_name_role = $10,
             had_response = $11,
             lead_level = $12,
             temperature = $13,
             status = $14,
             deal_value = $15,
             closed_at = $16,
             lost_reason = $17,
             next_action_date = $18,
             next_action_note = $19,
             first_contact_date = $20,
             followup_date_1 = $21,
             followup_date_2 = $22,
             followup_date_3 = $23,
             notes = $24,
             updated_at = NOW()
         WHERE id = $25
           AND organization_id = $26
         RETURNING *`,
        [
          normalized.company,
          normalized.city,
          normalized.phone,
          normalized.phone_digits,
          normalized.whatsapp,
          normalized.whatsapp_digits,
          normalized.email,
          normalized.site,
          normalized.maps_url,
          normalized.decisor_name_role,
          normalized.had_response,
          normalized.lead_level,
          normalized.temperature,
          normalized.status,
          normalized.deal_value,
          normalized.closed_at,
          normalized.lost_reason,
          normalized.next_action_date,
          normalized.next_action_note,
          normalized.first_contact_date,
          normalized.followup_date_1,
          normalized.followup_date_2,
          normalized.followup_date_3,
          normalized.notes,
          params.id,
          request.user.organizationId
        ]
      );

      await app.db.query(
        `INSERT INTO lead_activity (organization_id, lead_id, actor_user_id, action, details)
         VALUES ($1, $2, $3, 'updated', $4::jsonb)`,
        [
          request.user.organizationId,
          params.id,
          request.user.sub,
          JSON.stringify({ changedFields: changedFields.slice(0, 15) })
        ]
      );

      return result.rows[0];
    }
  );

  app.patch(
    "/api/leads/:id/status",
    {
      preHandler: [app.authenticate]
    },
    async (request) => {
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const payload = z.object({ status: z.enum(LEAD_STATUS) }).parse(request.body);

      const existing = await app.db.query(
        `SELECT id, status
         FROM leads
         WHERE id = $1
           AND organization_id = $2
         LIMIT 1`,
        [params.id, request.user.organizationId]
      );

      if (!existing.rowCount) {
        throw new AppError("Lead nao encontrado", 404);
      }

      const result = await app.db.query(
        `UPDATE leads
         SET status = $1,
             updated_at = NOW()
         WHERE id = $2
           AND organization_id = $3
         RETURNING *`,
        [payload.status, params.id, request.user.organizationId]
      );

      await app.db.query(
        `INSERT INTO lead_activity (organization_id, lead_id, actor_user_id, action, details)
         VALUES ($1, $2, $3, 'updated', $4::jsonb)`,
        [
          request.user.organizationId,
          params.id,
          request.user.sub,
          JSON.stringify({
            changedFields: [
              {
                field: "status",
                from: String(existing.rows[0].status ?? "-"),
                to: payload.status
              }
            ]
          })
        ]
      );

      return result.rows[0];
    }
  );

  app.delete(
    "/api/leads/:id",
    {
      preHandler: [app.authenticate]
    },
    async (request) => {
      await ensureAdmin(app, request.user.sub);
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const client = await app.db.connect();
      try {
        await client.query("BEGIN");

        await client.query(
          `DELETE FROM lead_activity
           WHERE organization_id = $1
             AND lead_id = $2`,
          [request.user.organizationId, params.id]
        );

        const deleted = await client.query(
          `DELETE FROM leads
           WHERE id = $1
             AND organization_id = $2
           RETURNING id`,
          [params.id, request.user.organizationId]
        );

        if (!deleted.rowCount) {
          throw new AppError("Lead n??o encontrado", 404);
        }

        await client.query("COMMIT");
        return { message: "Lead removido" };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
  );

  app.post(
    "/api/leads/bulk-delete",
    {
      preHandler: [app.authenticate]
    },
    async (request) => {
      await ensureAdmin(app, request.user.sub);
      const payload = leadBulkDeleteSchema.parse(request.body);
      const client = await app.db.connect();

      try {
        await client.query("BEGIN");

        await client.query(
          `DELETE FROM lead_activity
           WHERE organization_id = $1
             AND lead_id = ANY($2::uuid[])`,
          [request.user.organizationId, payload.ids]
        );

        const deleted = await client.query(
          `DELETE FROM leads
           WHERE organization_id = $1
             AND id = ANY($2::uuid[])
           RETURNING id`,
          [request.user.organizationId, payload.ids]
        );

        await client.query("COMMIT");

        return {
          message: `${deleted.rowCount ?? 0} lead(s) removido(s)`,
          deletedCount: deleted.rowCount ?? 0
        };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
  );

  app.post(
    "/api/leads/bulk-update",
    {
      preHandler: [app.authenticate]
    },
    async (request) => {
      await ensureAdmin(app, request.user.sub);
      const payload = leadBulkUpdateSchema.parse(request.body);

      const setParts: string[] = [];
      const values: Array<string | null | string[]> = [];

      if (payload.status) {
        values.push(payload.status);
        setParts.push(`status = $${values.length}`);
      }

      if (payload.temperature !== undefined) {
        values.push(payload.temperature ?? null);
        setParts.push(`temperature = $${values.length}`);
      }

      if (payload.next_action_date !== undefined) {
        values.push(payload.next_action_date ?? null);
        setParts.push(`next_action_date = $${values.length}`);
      }

      if (payload.responsible !== undefined) {
        values.push(payload.responsible ?? null);
        setParts.push(`decisor_name_role = $${values.length}`);
      }

      if (!setParts.length) {
        throw new AppError("Nenhum campo informado para atualizacao em massa", 400);
      }

      values.push(request.user.organizationId);
      values.push(payload.ids);
      const orgIndex = values.length - 1;
      const idsIndex = values.length;

      const updated = await app.db.query(
        `UPDATE leads
         SET ${setParts.join(", ")},
             updated_at = NOW()
         WHERE organization_id = $${orgIndex}
           AND id = ANY($${idsIndex}::uuid[])
         RETURNING id`,
        values
      );

      return {
        message: `${updated.rowCount ?? 0} lead(s) atualizado(s)`,
        updatedCount: updated.rowCount ?? 0
      };
    }
  );

  app.post(
    "/api/leads/import-preview",
    {
      preHandler: [app.authenticate]
    },
    async (request) => {
      const options = importOptionsSchema.parse(request.query);
      const file = await request.file();
      if (!file) {
        throw new AppError("Arquivo de importacao e obrigatorio (Excel ou CSV).", 400);
      }

      const buffer = await file.toBuffer();
      const { records } = parseUploadRecords(file.filename ?? "import.csv", buffer);
      if (!hasRequiredCsvHeaders(records)) {
        throw new AppError("Arquivo invalido. Use o modelo oficial de importacao.", 400);
      }

      let invalid = 0;
      let duplicates = 0;
      let skippedEmpty = 0;
      const invalidRows: Array<{ row: number; reason: string }> = [];
      const previewRows: Array<Record<string, string | null>> = [];
      const detectedHeaders = Array.from(new Set(records.flatMap((row) => Object.keys(row))));
      const resolvedHeaders = MINIMAL_CSV_HEADERS.filter((header) => detectedHeaders.includes(header));

      for (let index = 0; index < records.length; index += 1) {
        const row = records[index];
        if (!row) continue;
        if (index < 20) previewRows.push(row);

        const company = normalizeString(row[CSV_MAP.company]);
        const city = normalizeString(row[CSV_MAP.city]);
        const rawWhatsapp = normalizeString(row[CSV_MAP.whatsapp]);
        const rawEmail = normalizeString(row[CSV_MAP.email]);
        const emptyLine =
          !company &&
          !city &&
          !normalizeString(row[CSV_MAP.phone]) &&
          !rawWhatsapp &&
          !rawEmail &&
          !normalizeString(row[CSV_MAP.notes]);
        if (emptyLine) {
          skippedEmpty += 1;
          continue;
        }

        const phoneParsed = parsePhoneField(normalizeString(row[CSV_MAP.phone]), "Telefone");
        const whatsappParsed = parsePhoneField(rawWhatsapp, "WhatsApp");
        if (phoneParsed.invalidReason) {
          invalid += 1;
          invalidRows.push({ row: index + 2, reason: phoneParsed.invalidReason });
          continue;
        }
        if (whatsappParsed.invalidReason) {
          invalid += 1;
          invalidRows.push({ row: index + 2, reason: whatsappParsed.invalidReason });
          continue;
        }

        const email = extractEmailFromField(rawEmail);
        const whatsappDigits = normalizeDigits(whatsappParsed.phones[0] ?? null);
        const duplicateResult = await app.db.query(
          `SELECT id
           FROM leads
           WHERE organization_id = $1
             AND (
               ($2::text IS NOT NULL AND email = $2)
               OR ($3::text IS NOT NULL AND whatsapp_digits = $3)
               OR (($2::text IS NULL AND $3::text IS NULL) AND company = $4 AND COALESCE(city, '') = COALESCE($5, ''))
             )
           LIMIT 1`,
          [request.user.organizationId, email, whatsappDigits, company, city]
        );
        if (duplicateResult.rowCount && options.duplicateMode !== "allow") duplicates += 1;
      }

      return {
        totalRows: records.length,
        previewRows,
        detectedHeaders,
        resolvedHeaders,
        dryRun: true,
        duplicateMode: options.duplicateMode,
        duplicates,
        invalid,
        skippedEmpty,
        invalidRows: invalidRows.slice(0, 120)
      };
    }
  );

  app.get(
    "/api/leads/import-jobs",
    {
      preHandler: [app.authenticate]
    },
    async (request) => {
      const result = await app.db.query(
        `SELECT j.id, j.file_name, j.status, j.total_rows, j.imported_count, j.duplicate_count, j.invalid_count, j.created_at, j.finished_at, u.name AS created_by
         FROM lead_import_jobs j
         LEFT JOIN users u ON u.id = j.created_by_user_id
         WHERE j.organization_id = $1
         ORDER BY j.created_at DESC
         LIMIT 25`,
        [request.user.organizationId]
      );
      return { items: result.rows };
    }
  );

  app.get(
    "/api/leads/import-jobs/:id/errors.csv",
    {
      preHandler: [app.authenticate]
    },
    async (request, reply) => {
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const job = await app.db.query(
        `SELECT report
         FROM lead_import_jobs
         WHERE id = $1
           AND organization_id = $2
         LIMIT 1`,
        [params.id, request.user.organizationId]
      );
      if (!job.rowCount) throw new AppError("Importacao nao encontrada", 404);
      const report = (job.rows[0].report as { invalidRows?: Array<{ row: number; reason: string }> } | null) ?? {};
      const invalidRows = report.invalidRows ?? [];
      const csv = ["linha,motivo", ...invalidRows.map((item) => `${item.row},"${String(item.reason).replace(/"/g, '""')}"`)].join("\n");
      return reply
        .header("Content-Type", "text/csv; charset=utf-8")
        .header("Content-Disposition", "attachment; filename=import-errors.csv")
        .send(csv);
    }
  );

  app.post(
    "/api/leads/import-jobs/:id/revert",
    {
      preHandler: [app.authenticate]
    },
    async (request) => {
      await ensureAdmin(app, request.user.sub);
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const client = await app.db.connect();
      try {
        await client.query("BEGIN");
        const leadsToDelete = await client.query(
          `SELECT lead_id
           FROM lead_activity
           WHERE organization_id = $1
             AND action = 'imported'
             AND details ->> 'importJobId' = $2`,
          [request.user.organizationId, params.id]
        );
        const ids = leadsToDelete.rows.map((row) => row.lead_id as string);
        if (ids.length > 0) {
          await client.query(
            `DELETE FROM lead_activity
             WHERE organization_id = $1
               AND lead_id = ANY($2::uuid[])`,
            [request.user.organizationId, ids]
          );
          await client.query(
            `DELETE FROM leads
             WHERE organization_id = $1
               AND id = ANY($2::uuid[])`,
            [request.user.organizationId, ids]
          );
        }
        await client.query(
          `UPDATE lead_import_jobs
           SET status = 'reverted'
           WHERE id = $1
             AND organization_id = $2`,
          [params.id, request.user.organizationId]
        );
        await client.query("COMMIT");
        return { revertedCount: ids.length, message: `${ids.length} lead(s) revertido(s)` };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
  );

  app.post(
    "/api/leads/import",
    {
      preHandler: [app.authenticate]
    },
    async (request) => {
      const options = importOptionsSchema.parse(request.query);
      const duplicateMode = options.skipDuplicates ? "skip" : options.duplicateMode;
      const file = await request.file();
      if (!file) {
        throw new AppError("Arquivo de importacao e obrigatorio (Excel ou CSV).", 400);
      }

      const buffer = await file.toBuffer();
      const { records } = parseUploadRecords(file.filename ?? "import.csv", buffer);
      if (!hasRequiredCsvHeaders(records)) {
        throw new AppError("Arquivo invalido. Use o modelo oficial de importacao.", 400);
      }

      const importJob = options.dryRun
        ? null
        : await app.db.query(
            `INSERT INTO lead_import_jobs (organization_id, created_by_user_id, file_name, status)
             VALUES ($1, $2, $3, 'processing')
             RETURNING id`,
            [request.user.organizationId, request.user.sub, file.filename ?? "import.csv"]
          );
      const jobId = (importJob?.rows[0]?.id as string | undefined) ?? null;

      let imported = 0;
      let updated = 0;
      let duplicates = 0;
      let invalid = 0;
      let invalidPhoneCount = 0;
      let skippedEmpty = 0;
      const invalidRows: Array<{ row: number; reason: string }> = [];

      for (let index = 0; index < records.length; index += 1) {
        const row = records[index];
        if (!row) continue;
        const company = normalizeString(row[CSV_MAP.company]);
        const city = normalizeString(row[CSV_MAP.city]);
        const rawWhatsapp = normalizeString(row[CSV_MAP.whatsapp]);
        const rawEmail = normalizeString(row[CSV_MAP.email]);
        const emptyLine =
          !company &&
          !city &&
          !normalizeString(row[CSV_MAP.phone]) &&
          !rawWhatsapp &&
          !rawEmail &&
          !normalizeString(row[CSV_MAP.notes]);
        if (emptyLine) {
          skippedEmpty += 1;
          continue;
        }

        const statusRaw = normalizeString(row[CSV_MAP.status]);
        const statusFromFile = statusRaw ? statusMap[statusRaw.toLowerCase()] ?? "lead_novo" : "lead_novo";
        const hadResponseRaw = normalizeString(row[CSV_MAP.hadResponse]);
        const hadResponse = hadResponseRaw ? hadResponseMap[hadResponseRaw.toLowerCase()] ?? null : null;
        const leadLevelRaw = normalizeString(row[CSV_MAP.leadLevel]);
        const leadLevel = leadLevelRaw ? leadLevelMap[leadLevelRaw.toLowerCase()] ?? null : null;
        const email = extractEmailFromField(rawEmail);
        const phoneParsed = parsePhoneField(normalizeString(row[CSV_MAP.phone]), "Telefone");
        const whatsappParsed = parsePhoneField(rawWhatsapp, "WhatsApp");
        if (phoneParsed.invalidReason) {
          invalid += 1;
          invalidPhoneCount += 1;
          invalidRows.push({ row: index + 2, reason: phoneParsed.invalidReason });
          continue;
        }
        if (whatsappParsed.invalidReason) {
          invalid += 1;
          invalidPhoneCount += 1;
          invalidRows.push({ row: index + 2, reason: whatsappParsed.invalidReason });
          continue;
        }

        const phoneCandidates = phoneParsed.phones;
        const whatsappCandidates = whatsappParsed.phones;
        let cleanedPhone = phoneCandidates[0] ?? null;
        let cleanedWhatsapp = whatsappCandidates[0] ?? null;
        if (!cleanedWhatsapp && phoneCandidates.length > 1) cleanedWhatsapp = phoneCandidates[1] ?? null;
        if (!cleanedPhone && whatsappCandidates.length > 1) cleanedPhone = whatsappCandidates[1] ?? null;

        const whatsappDigits = normalizeDigits(cleanedWhatsapp);
        const duplicateResult = await app.db.query(
          `SELECT id
           FROM leads
           WHERE organization_id = $1
             AND (
               ($2::text IS NOT NULL AND email = $2)
               OR ($3::text IS NOT NULL AND whatsapp_digits = $3)
               OR (($2::text IS NULL AND $3::text IS NULL) AND company = $4 AND COALESCE(city, '') = COALESCE($5, ''))
             )
           LIMIT 1`,
          [request.user.organizationId, email, whatsappDigits, company, city]
        );
        const duplicateLeadId = duplicateResult.rows[0]?.id as string | undefined;

        const noteFromFile = normalizeString(row[CSV_MAP.notes]);
        const sourceMeta = options.source ? `[origem:${options.source}]` : null;
        const campaignMeta = options.campaign ? `[campanha:${options.campaign}]` : null;
        const mergedNotes = [sourceMeta, campaignMeta, noteFromFile].filter(Boolean).join(" ").trim() || null;

        const input = {
          company,
          city,
          phone: cleanedPhone,
          whatsapp: cleanedWhatsapp,
          email,
          site: normalizeString(row[CSV_MAP.site]),
          maps_url: normalizeString(row[CSV_MAP.mapsUrl]),
          decisor_name_role: normalizeString(row[CSV_MAP.decisor]) || options.defaultResponsible || null,
          had_response: hadResponse,
          lead_level: leadLevel,
          temperature: options.defaultTemperature ?? null,
          status: options.defaultStatus ?? statusFromFile,
          first_contact_date: parseCsvDate(row[CSV_MAP.firstContactDate]),
          followup_date_1: parseCsvDate(row[CSV_MAP.followup1]),
          followup_date_2: parseCsvDate(row[CSV_MAP.followup2]),
          followup_date_3: parseCsvDate(row[CSV_MAP.followup3]),
          notes: mergedNotes
        };

        try {
          const validated = leadInputSchema.parse(input);
          const normalized = normalizeLeadInput(validated);

          if (duplicateLeadId && duplicateMode === "skip") {
            duplicates += 1;
            continue;
          }

          if (duplicateLeadId && duplicateMode === "update") {
            if (options.dryRun) {
              updated += 1;
              continue;
            }
            await app.db.query(
              `UPDATE leads
               SET company = COALESCE($1, company),
                   city = COALESCE($2, city),
                   phone = COALESCE($3, phone),
                   phone_digits = COALESCE($4, phone_digits),
                   whatsapp = COALESCE($5, whatsapp),
                   whatsapp_digits = COALESCE($6, whatsapp_digits),
                   email = COALESCE($7, email),
                   site = COALESCE($8, site),
                   maps_url = COALESCE($9, maps_url),
                   decisor_name_role = COALESCE($10, decisor_name_role),
                   had_response = COALESCE($11, had_response),
                   lead_level = COALESCE($12, lead_level),
                   temperature = COALESCE($13, temperature),
                   status = COALESCE($14, status),
                   first_contact_date = COALESCE($15, first_contact_date),
                   followup_date_1 = COALESCE($16, followup_date_1),
                   followup_date_2 = COALESCE($17, followup_date_2),
                   followup_date_3 = COALESCE($18, followup_date_3),
                   notes = COALESCE($19, notes),
                   updated_at = NOW()
               WHERE id = $20
                 AND organization_id = $21`,
              [
                normalized.company,
                normalized.city,
                normalized.phone,
                normalized.phone_digits,
                normalized.whatsapp,
                normalized.whatsapp_digits,
                normalized.email,
                normalized.site,
                normalized.maps_url,
                normalized.decisor_name_role,
                normalized.had_response,
                normalized.lead_level,
                normalized.temperature,
                normalized.status,
                normalized.first_contact_date,
                normalized.followup_date_1,
                normalized.followup_date_2,
                normalized.followup_date_3,
                normalized.notes,
                duplicateLeadId,
                request.user.organizationId
              ]
            );
            if (jobId) {
              await app.db.query(
                `INSERT INTO lead_activity (organization_id, lead_id, actor_user_id, action, details)
                 VALUES ($1, $2, $3, 'imported_update', $4::jsonb)`,
                [request.user.organizationId, duplicateLeadId, request.user.sub, JSON.stringify({ importJobId: jobId })]
              );
            }
            updated += 1;
            continue;
          }

          if (duplicateLeadId && duplicateMode === "merge_empty") {
            if (options.dryRun) {
              updated += 1;
              continue;
            }
            await app.db.query(
              `UPDATE leads
               SET company = CASE WHEN NULLIF(company, '') IS NULL THEN COALESCE($1, company) ELSE company END,
                   city = CASE WHEN NULLIF(city, '') IS NULL THEN COALESCE($2, city) ELSE city END,
                   phone = CASE WHEN NULLIF(phone, '') IS NULL THEN COALESCE($3, phone) ELSE phone END,
                   phone_digits = CASE WHEN NULLIF(phone_digits, '') IS NULL THEN COALESCE($4, phone_digits) ELSE phone_digits END,
                   whatsapp = CASE WHEN NULLIF(whatsapp, '') IS NULL THEN COALESCE($5, whatsapp) ELSE whatsapp END,
                   whatsapp_digits = CASE WHEN NULLIF(whatsapp_digits, '') IS NULL THEN COALESCE($6, whatsapp_digits) ELSE whatsapp_digits END,
                   email = CASE WHEN NULLIF(email, '') IS NULL THEN COALESCE($7, email) ELSE email END,
                   site = CASE WHEN NULLIF(site, '') IS NULL THEN COALESCE($8, site) ELSE site END,
                   maps_url = CASE WHEN NULLIF(maps_url, '') IS NULL THEN COALESCE($9, maps_url) ELSE maps_url END,
                   decisor_name_role = CASE WHEN NULLIF(decisor_name_role, '') IS NULL THEN COALESCE($10, decisor_name_role) ELSE decisor_name_role END,
                   had_response = CASE WHEN had_response IS NULL THEN COALESCE($11, had_response) ELSE had_response END,
                   lead_level = CASE WHEN lead_level IS NULL THEN COALESCE($12, lead_level) ELSE lead_level END,
                   temperature = CASE WHEN temperature IS NULL THEN COALESCE($13, temperature) ELSE temperature END,
                   first_contact_date = CASE WHEN first_contact_date IS NULL THEN COALESCE($14, first_contact_date) ELSE first_contact_date END,
                   followup_date_1 = CASE WHEN followup_date_1 IS NULL THEN COALESCE($15, followup_date_1) ELSE followup_date_1 END,
                   followup_date_2 = CASE WHEN followup_date_2 IS NULL THEN COALESCE($16, followup_date_2) ELSE followup_date_2 END,
                   followup_date_3 = CASE WHEN followup_date_3 IS NULL THEN COALESCE($17, followup_date_3) ELSE followup_date_3 END,
                   notes = CASE WHEN NULLIF(notes, '') IS NULL THEN COALESCE($18, notes) ELSE notes END,
                   updated_at = NOW()
               WHERE id = $19
                 AND organization_id = $20`,
              [
                normalized.company,
                normalized.city,
                normalized.phone,
                normalized.phone_digits,
                normalized.whatsapp,
                normalized.whatsapp_digits,
                normalized.email,
                normalized.site,
                normalized.maps_url,
                normalized.decisor_name_role,
                normalized.had_response,
                normalized.lead_level,
                normalized.temperature,
                normalized.first_contact_date,
                normalized.followup_date_1,
                normalized.followup_date_2,
                normalized.followup_date_3,
                normalized.notes,
                duplicateLeadId,
                request.user.organizationId
              ]
            );
            if (jobId) {
              await app.db.query(
                `INSERT INTO lead_activity (organization_id, lead_id, actor_user_id, action, details)
                 VALUES ($1, $2, $3, 'imported_merge_empty', $4::jsonb)`,
                [request.user.organizationId, duplicateLeadId, request.user.sub, JSON.stringify({ importJobId: jobId })]
              );
            }
            updated += 1;
            continue;
          }

          if (options.dryRun) {
            imported += 1;
            continue;
          }

          const client = await app.db.connect();
          try {
            await client.query("BEGIN");
            const leadNumber = await nextLeadNumber(client, request.user.organizationId, request.user.sub);
            const createdLead = await client.query(
              `INSERT INTO leads (
                organization_id, owner_user_id, lead_number, company, city, phone, phone_digits,
                whatsapp, whatsapp_digits, email, site, maps_url, decisor_name_role,
                had_response, lead_level, temperature, status, first_contact_date, followup_date_1,
                followup_date_2, followup_date_3, notes
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
                $14, $15, $16, $17, $18, $19, $20, $21, $22
              ) RETURNING id`,
              [
                request.user.organizationId,
                request.user.sub,
                leadNumber,
                normalized.company,
                normalized.city,
                normalized.phone,
                normalized.phone_digits,
                normalized.whatsapp,
                normalized.whatsapp_digits,
                normalized.email,
                normalized.site,
                normalized.maps_url,
                normalized.decisor_name_role,
                normalized.had_response,
                normalized.lead_level,
                normalized.temperature,
                normalized.status,
                normalized.first_contact_date,
                normalized.followup_date_1,
                normalized.followup_date_2,
                normalized.followup_date_3,
                normalized.notes
              ]
            );
            if (jobId) {
              await client.query(
                `INSERT INTO lead_activity (organization_id, lead_id, actor_user_id, action, details)
                 VALUES ($1, $2, $3, 'imported', $4::jsonb)`,
                [request.user.organizationId, createdLead.rows[0].id, request.user.sub, JSON.stringify({ importJobId: jobId })]
              );
            }
            await client.query("COMMIT");
            imported += 1;
          } catch (error) {
            await client.query("ROLLBACK");
            throw error;
          } finally {
            client.release();
          }
        } catch (error: any) {
          const reason =
            error?.issues?.[0]?.message ??
            error?.issues?.[0]?.path?.join(".") ??
            error.message ??
            "Linha invalida";
          invalid += 1;
          invalidRows.push({ row: index + 2, reason });
        }
      }

      if (jobId) {
        await app.db.query(
          `UPDATE lead_import_jobs
           SET status = 'completed',
               total_rows = $1,
               imported_count = $2,
               duplicate_count = $3,
               invalid_count = $4,
               report = $5::jsonb,
               finished_at = NOW()
           WHERE id = $6`,
          [
            records.length,
            imported + updated,
            duplicates,
            invalid,
            JSON.stringify({ invalidRows, invalidPhoneCount, skippedEmpty, updated, duplicateMode }),
            jobId
          ]
        );
      }

      return {
        totalRows: records.length,
        imported,
        updated,
        duplicates,
        invalid,
        invalidPhoneCount,
        skippedEmpty,
        invalidRows: invalidRows.slice(0, 120),
        dryRun: options.dryRun,
        duplicateMode,
        jobId
      };
    }
  );
}
