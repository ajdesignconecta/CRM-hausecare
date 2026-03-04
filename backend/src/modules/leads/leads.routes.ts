import { parse } from "csv-parse/sync";
import { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "../../lib/errors.js";
import {
  formatBrazilianPhone,
  normalizeDigits,
  normalizeString,
  parseCsvDate
} from "../../lib/utils.js";
import { HAD_RESPONSE, LEAD_LEVEL, LEAD_STATUS } from "./lead.constants.js";
import { importOptionsSchema, leadInputSchema, leadQuerySchema } from "./lead.schemas.js";
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
  notes: "Observações",
  hadResponse: "Teve resposta",
  leadLevel: "Nível do lead"
} as const;

const statusMap: Record<string, (typeof LEAD_STATUS)[number]> = {
  "lead novo": "lead_novo",
  "em contato": "em_contato",
  "reunião marcada": "reuniao_marcada",
  "reuniao marcada": "reuniao_marcada",
  "proposta enviada": "proposta_enviada",
  fechado: "fechado",
  perdido: "perdido"
};

const hadResponseMap: Record<string, (typeof HAD_RESPONSE)[number]> = {
  sim: "sim",
  não: "nao",
  nao: "nao"
};

const leadLevelMap: Record<string, (typeof LEAD_LEVEL)[number]> = {
  "com interesse": "com_interesse",
  "sem interesse": "sem_interesse",
  "não respondeu": "nao_respondeu",
  "nao respondeu": "nao_respondeu"
};

const exportCsvSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  city: z.string().optional(),
  lead_level: z.string().optional(),
  had_response: z.string().optional()
});

export async function leadsRoutes(app: FastifyInstance) {
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

      const whereClause = conditions.join(" AND ");

      const listValues = [...values, query.pageSize, offset];
      const listQuery = `
        SELECT *
        FROM leads
        WHERE ${whereClause}
        ORDER BY updated_at DESC
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
        "Observações",
        "Teve resposta",
        "Nível do lead"
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
            had_response, lead_level, status, first_contact_date, followup_date_1,
            followup_date_2, followup_date_3, notes
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
            $14, $15, $16, $17, $18, $19, $20, $21
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
            normalized.status,
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
        throw new AppError("Lead não encontrado", 404);
      }

      return result.rows[0];
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
        `SELECT id
         FROM leads
         WHERE id = $1
           AND organization_id = $2
         LIMIT 1`,
        [params.id, request.user.organizationId]
      );

      if (!existing.rowCount) {
        throw new AppError("Lead não encontrado", 404);
      }

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
             status = $13,
             first_contact_date = $14,
             followup_date_1 = $15,
             followup_date_2 = $16,
             followup_date_3 = $17,
             notes = $18,
             updated_at = NOW()
         WHERE id = $19
           AND organization_id = $20
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
          normalized.status,
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
         VALUES ($1, $2, $3, 'updated', '{}'::jsonb)`,
        [request.user.organizationId, params.id, request.user.sub]
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
      const params = z.object({ id: z.string().uuid() }).parse(request.params);
      const deleted = await app.db.query(
        `DELETE FROM leads
         WHERE id = $1
           AND organization_id = $2
         RETURNING id`,
        [params.id, request.user.organizationId]
      );

      if (!deleted.rowCount) {
        throw new AppError("Lead não encontrado", 404);
      }

      return { message: "Lead removido" };
    }
  );

  app.post(
    "/api/leads/import",
    {
      preHandler: [app.authenticate]
    },
    async (request) => {
      const options = importOptionsSchema.parse(request.query);
      const file = await request.file();

      if (!file) {
        throw new AppError("Arquivo CSV é obrigatório", 400);
      }

      const content = (await file.toBuffer()).toString("utf-8");
      const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      }) as Record<string, string>[];

      const importJob = await app.db.query(
        `INSERT INTO lead_import_jobs (organization_id, created_by_user_id, file_name, status)
         VALUES ($1, $2, $3, 'processing')
         RETURNING id`,
        [request.user.organizationId, request.user.sub, file.filename ?? "import.csv"]
      );

      const jobId = importJob.rows[0].id as string;

      let imported = 0;
      let duplicates = 0;
      let invalid = 0;
      const invalidRows: Array<{ row: number; reason: string }> = [];

      for (let index = 0; index < records.length; index += 1) {
        const row = records[index];
        if (!row) {
          continue;
        }

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
          continue;
        }

        if (!company) {
          invalid += 1;
          invalidRows.push({ row: index + 2, reason: "Empresa obrigatória" });
          continue;
        }

        const status = statusMap[(normalizeString(row[CSV_MAP.status]) ?? "lead novo").toLowerCase()];
        if (!status) {
          invalid += 1;
          invalidRows.push({ row: index + 2, reason: "Status inválido" });
          continue;
        }

        const hadResponseRaw = normalizeString(row[CSV_MAP.hadResponse]);
        const hadResponse = hadResponseRaw ? hadResponseMap[hadResponseRaw.toLowerCase()] : null;
        if (hadResponseRaw && !hadResponse) {
          invalid += 1;
          invalidRows.push({ row: index + 2, reason: "Teve resposta inválido" });
          continue;
        }

        const leadLevelRaw = normalizeString(row[CSV_MAP.leadLevel]);
        const leadLevel = leadLevelRaw ? leadLevelMap[leadLevelRaw.toLowerCase()] : null;
        if (leadLevelRaw && !leadLevel) {
          invalid += 1;
          invalidRows.push({ row: index + 2, reason: "Nível do lead inválido" });
          continue;
        }

        const email = rawEmail?.toLowerCase() ?? null;
        const whatsappDigits = normalizeDigits(rawWhatsapp);

        if (options.skipDuplicates) {
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

          if (duplicateResult.rowCount) {
            duplicates += 1;
            continue;
          }
        }

        const input = {
          company,
          city,
          phone: row[CSV_MAP.phone],
          whatsapp: rawWhatsapp,
          email,
          site: normalizeString(row[CSV_MAP.site]),
          maps_url: normalizeString(row[CSV_MAP.mapsUrl]),
          decisor_name_role: normalizeString(row[CSV_MAP.decisor]),
          had_response: hadResponse,
          lead_level: leadLevel,
          status,
          first_contact_date: parseCsvDate(row[CSV_MAP.firstContactDate]),
          followup_date_1: parseCsvDate(row[CSV_MAP.followup1]),
          followup_date_2: parseCsvDate(row[CSV_MAP.followup2]),
          followup_date_3: parseCsvDate(row[CSV_MAP.followup3]),
          notes: normalizeString(row[CSV_MAP.notes])
        };

        try {
          const validated = leadInputSchema.parse(input);
          const normalized = normalizeLeadInput(validated);
          const client = await app.db.connect();

          try {
            await client.query("BEGIN");
            const leadNumber = await nextLeadNumber(client, request.user.organizationId, request.user.sub);

            const createdLead = await client.query(
              `INSERT INTO leads (
                organization_id, owner_user_id, lead_number, company, city, phone, phone_digits,
                whatsapp, whatsapp_digits, email, site, maps_url, decisor_name_role,
                had_response, lead_level, status, first_contact_date, followup_date_1,
                followup_date_2, followup_date_3, notes
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
                $14, $15, $16, $17, $18, $19, $20, $21
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
                normalized.status,
                normalized.first_contact_date,
                normalized.followup_date_1,
                normalized.followup_date_2,
                normalized.followup_date_3,
                normalized.notes
              ]
            );

            await client.query(
              `INSERT INTO lead_activity (organization_id, lead_id, actor_user_id, action, details)
               VALUES ($1, $2, $3, 'imported', $4::jsonb)`,
              [
                request.user.organizationId,
                createdLead.rows[0].id,
                request.user.sub,
                JSON.stringify({ importJobId: jobId })
              ]
            );

            await client.query("COMMIT");
            imported += 1;
          } catch (error) {
            await client.query("ROLLBACK");
            throw error;
          } finally {
            client.release();
          }
        } catch (error: any) {
          invalid += 1;
          invalidRows.push({ row: index + 2, reason: error.message ?? "Linha inválida" });
        }
      }

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
        [records.length, imported, duplicates, invalid, JSON.stringify({ invalidRows }), jobId]
      );

      return {
        totalRows: records.length,
        imported,
        duplicates,
        invalid,
        invalidRows
      };
    }
  );
}
