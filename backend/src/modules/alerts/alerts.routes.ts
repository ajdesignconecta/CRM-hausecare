import { FastifyInstance } from "fastify";
import { z } from "zod";

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(30).default(7)
});

export async function alertsRoutes(app: FastifyInstance) {
  app.get(
    "/api/alerts/followups",
    {
      preHandler: [app.authenticate]
    },
    async (request) => {
      const { days } = querySchema.parse(request.query);

      const upcoming = await app.db.query(
        `
        SELECT id, lead_number, company, status, followup_date, followup_kind
        FROM (
          SELECT id, lead_number, company, status, followup_date_1 AS followup_date, 'followup_date_1' AS followup_kind
          FROM leads
          WHERE organization_id = $1
          UNION ALL
          SELECT id, lead_number, company, status, followup_date_2, 'followup_date_2'
          FROM leads
          WHERE organization_id = $1
          UNION ALL
          SELECT id, lead_number, company, status, followup_date_3, 'followup_date_3'
          FROM leads
          WHERE organization_id = $1
        ) expanded
        WHERE followup_date IS NOT NULL
          AND followup_date >= CURRENT_DATE
          AND followup_date <= CURRENT_DATE + $2::int
          AND status NOT IN ('fechado', 'perdido')
        ORDER BY followup_date ASC
        LIMIT 50
      `,
        [request.user.organizationId, days]
      );

      const overdue = await app.db.query(
        `
        SELECT id, lead_number, company, status, followup_date, followup_kind
        FROM (
          SELECT id, lead_number, company, status, followup_date_1 AS followup_date, 'followup_date_1' AS followup_kind
          FROM leads
          WHERE organization_id = $1
          UNION ALL
          SELECT id, lead_number, company, status, followup_date_2, 'followup_date_2'
          FROM leads
          WHERE organization_id = $1
          UNION ALL
          SELECT id, lead_number, company, status, followup_date_3, 'followup_date_3'
          FROM leads
          WHERE organization_id = $1
        ) expanded
        WHERE followup_date IS NOT NULL
          AND followup_date < CURRENT_DATE
          AND status NOT IN ('fechado', 'perdido')
        ORDER BY followup_date ASC
        LIMIT 50
      `,
        [request.user.organizationId]
      );

      return {
        days,
        upcoming: upcoming.rows,
        overdue: overdue.rows,
        badgeCount: (upcoming.rowCount ?? 0) + (overdue.rowCount ?? 0)
      };
    }
  );
}
