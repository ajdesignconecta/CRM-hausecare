import { FastifyInstance } from "fastify";
import { z } from "zod";

const querySchema = z.object({
  days: z.coerce.number().int().min(0).max(30).default(0)
});

export async function alertsRoutes(app: FastifyInstance) {
  app.get(
    "/api/dashboard/summary",
    {
      preHandler: [app.authenticate]
    },
    async (request) => {
      const orgId = request.user.organizationId;
      const pctChange = (current: number, previous: number) => {
        if (!previous) return current ? 100 : 0;
        return Number((((current - previous) / previous) * 100).toFixed(1));
      };

      const client = await app.db.connect();
      try {
        const totals = await client.query(
            `
            SELECT
              COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE lead_level = 'com_interesse')::int AS com_interesse,
              COUNT(*) FILTER (WHERE status = 'reuniao_marcada')::int AS reunioes,
              COUNT(*) FILTER (WHERE status = 'proposta_enviada')::int AS propostas,
              COUNT(*) FILTER (WHERE status = 'fechado')::int AS fechados
            FROM leads
            WHERE organization_id = $1
          `,
            [orgId]
          );
        const monthStats = await client.query(
            `
            WITH ranges AS (
              SELECT
                date_trunc('month', CURRENT_DATE)::date AS current_start,
                (date_trunc('month', CURRENT_DATE) + interval '1 month')::date AS current_end,
                (date_trunc('month', CURRENT_DATE) - interval '1 month')::date AS previous_start,
                date_trunc('month', CURRENT_DATE)::date AS previous_end
            )
            SELECT
              COALESCE(SUM(CASE WHEN l.status = 'fechado' AND COALESCE(l.closed_at, l.updated_at::date) >= r.current_start AND COALESCE(l.closed_at, l.updated_at::date) < r.current_end THEN COALESCE(l.deal_value, 0) ELSE 0 END), 0)::float8 AS revenue_current,
              COALESCE(SUM(CASE WHEN l.status = 'fechado' AND COALESCE(l.closed_at, l.updated_at::date) >= r.previous_start AND COALESCE(l.closed_at, l.updated_at::date) < r.previous_end THEN COALESCE(l.deal_value, 0) ELSE 0 END), 0)::float8 AS revenue_previous,
              COUNT(*) FILTER (WHERE l.created_at::date >= r.current_start AND l.created_at::date < r.current_end)::int AS created_current,
              COUNT(*) FILTER (WHERE l.created_at::date >= r.previous_start AND l.created_at::date < r.previous_end)::int AS created_previous,
              COUNT(*) FILTER (WHERE l.status = 'fechado' AND COALESCE(l.closed_at, l.updated_at::date) >= r.current_start AND COALESCE(l.closed_at, l.updated_at::date) < r.current_end)::int AS won_current,
              COUNT(*) FILTER (WHERE l.status = 'fechado' AND COALESCE(l.closed_at, l.updated_at::date) >= r.previous_start AND COALESCE(l.closed_at, l.updated_at::date) < r.previous_end)::int AS won_previous,
              COALESCE(AVG(CASE WHEN l.status = 'fechado' AND COALESCE(l.closed_at, l.updated_at::date) >= r.current_start AND COALESCE(l.closed_at, l.updated_at::date) < r.current_end THEN l.deal_value END), 0)::float8 AS avg_ticket_current,
              COALESCE(AVG(CASE WHEN l.status = 'fechado' AND COALESCE(l.closed_at, l.updated_at::date) >= r.previous_start AND COALESCE(l.closed_at, l.updated_at::date) < r.previous_end THEN l.deal_value END), 0)::float8 AS avg_ticket_previous,
              COALESCE(AVG(CASE WHEN l.status = 'fechado' AND COALESCE(l.closed_at, l.updated_at::date) >= r.current_start AND COALESCE(l.closed_at, l.updated_at::date) < r.current_end THEN (COALESCE(l.closed_at, l.updated_at::date) - l.created_at::date) END), 0)::float8 AS funnel_days_current,
              COALESCE(AVG(CASE WHEN l.status = 'fechado' AND COALESCE(l.closed_at, l.updated_at::date) >= r.previous_start AND COALESCE(l.closed_at, l.updated_at::date) < r.previous_end THEN (COALESCE(l.closed_at, l.updated_at::date) - l.created_at::date) END), 0)::float8 AS funnel_days_previous
            FROM ranges r
            LEFT JOIN leads l ON l.organization_id = $1
          `,
            [orgId]
          );
        const funnel = await client.query(
            `
            SELECT status, COUNT(*)::int AS total
            FROM leads
            WHERE organization_id = $1
            GROUP BY status
          `,
            [orgId]
          );
        const trend = await client.query(
            `
            WITH bounds AS (
              SELECT
                COALESCE(
                  date_trunc('week', MIN(created_at))::date,
                  (date_trunc('week', CURRENT_DATE) - interval '7 weeks')::date
                ) AS min_week
              FROM leads
              WHERE organization_id = $1
            ),
            weeks AS (
              SELECT generate_series(
                (SELECT min_week FROM bounds),
                date_trunc('week', CURRENT_DATE)::date,
                interval '1 week'
              )::date AS week_start
            )
            SELECT
              w.week_start,
              COUNT(l.id) FILTER (WHERE l.created_at::date >= w.week_start AND l.created_at::date < w.week_start + 7)::int AS entradas,
              COUNT(l.id) FILTER (WHERE l.status = 'reuniao_marcada' AND l.updated_at::date >= w.week_start AND l.updated_at::date < w.week_start + 7)::int AS reunioes,
              COUNT(l.id) FILTER (WHERE l.status = 'proposta_enviada' AND l.updated_at::date >= w.week_start AND l.updated_at::date < w.week_start + 7)::int AS propostas,
              COUNT(l.id) FILTER (WHERE l.status = 'fechado' AND COALESCE(l.closed_at, l.updated_at::date) >= w.week_start AND COALESCE(l.closed_at, l.updated_at::date) < w.week_start + 7)::int AS fechados
            FROM weeks w
            LEFT JOIN leads l ON l.organization_id = $1
            GROUP BY w.week_start
            ORDER BY w.week_start ASC
          `,
            [orgId]
          );
        const lossReasons = await client.query(
            `
            SELECT lost_reason AS reason, COUNT(*)::int AS total
            FROM leads
            WHERE organization_id = $1
              AND status = 'perdido'
              AND lost_reason IS NOT NULL
              AND lost_reason <> ''
            GROUP BY lost_reason
            ORDER BY total DESC
            LIMIT 5
          `,
            [orgId]
          );
        const upcoming = await client.query(
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
              AND followup_date <= CURRENT_DATE + 7
              AND status NOT IN ('fechado', 'perdido')
            ORDER BY followup_date ASC
            LIMIT 50
          `,
            [orgId]
          );
        const overdue = await client.query(
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
            [orgId]
          );
        const tasks = await client.query(
            `
            SELECT
              COUNT(*) FILTER (
                WHERE status NOT IN ('fechado', 'perdido')
                  AND (
                    followup_date_1 = CURRENT_DATE
                    OR followup_date_2 = CURRENT_DATE
                    OR followup_date_3 = CURRENT_DATE
                    OR next_action_date = CURRENT_DATE
                  )
              )::int AS today_due,
              COUNT(*) FILTER (
                WHERE status NOT IN ('fechado', 'perdido')
                  AND (
                    (followup_date_1 IS NOT NULL AND followup_date_1 < CURRENT_DATE)
                    OR (followup_date_2 IS NOT NULL AND followup_date_2 < CURRENT_DATE)
                    OR (followup_date_3 IS NOT NULL AND followup_date_3 < CURRENT_DATE)
                    OR (next_action_date IS NOT NULL AND next_action_date < CURRENT_DATE)
                  )
              )::int AS overdue,
              COUNT(*) FILTER (
                WHERE status NOT IN ('fechado', 'perdido')
                  AND first_contact_date IS NULL
                  AND created_at::date <= CURRENT_DATE - 7
              )::int AS stale_without_contact
            FROM leads
            WHERE organization_id = $1
          `,
            [orgId]
          );
        const hotLeads = await client.query(
            `
            SELECT id, lead_number, company, status, temperature, updated_at
            FROM leads
            WHERE organization_id = $1
              AND status NOT IN ('fechado', 'perdido')
              AND temperature = 'quente'
            ORDER BY updated_at DESC
            LIMIT 12
          `,
            [orgId]
          );
        const meetings = await client.query(
            `
            SELECT id, lead_number, company, status, next_action_date, followup_date_1
            FROM leads
            WHERE organization_id = $1
              AND status = 'reuniao_marcada'
            ORDER BY COALESCE(next_action_date, followup_date_1, CURRENT_DATE + 365) ASC
            LIMIT 12
          `,
            [orgId]
          );
        const wonRecent = await client.query(
            `
            SELECT id, lead_number, company, deal_value, closed_at, updated_at
            FROM leads
            WHERE organization_id = $1
              AND status = 'fechado'
            ORDER BY COALESCE(closed_at, updated_at::date) DESC
            LIMIT 12
          `,
            [orgId]
          );
        const dataQuality = await client.query(
            `
            SELECT
              COUNT(*) FILTER (WHERE phone IS NULL OR phone = '')::int AS without_phone,
              COUNT(*) FILTER (WHERE decisor_name_role IS NULL OR decisor_name_role = '')::int AS without_decisor,
              COUNT(*) FILTER (WHERE city IS NULL OR city = '')::int AS without_city
            FROM leads
            WHERE organization_id = $1
          `,
            [orgId]
          );

        const month = monthStats.rows[0] as any;
        const conversionCurrent = month.created_current
          ? Number(((month.won_current / month.created_current) * 100).toFixed(1))
          : 0;
        const conversionPrevious = month.created_previous
          ? Number(((month.won_previous / month.created_previous) * 100).toFixed(1))
          : 0;

        const funnelMap = {
          lead_novo: 0,
          em_contato: 0,
          reuniao_marcada: 0,
          proposta_enviada: 0,
          fechado: 0,
          perdido: 0
        } as Record<string, number>;

        for (const row of funnel.rows as Array<{ status: string; total: number }>) {
          funnelMap[row.status] = Number(row.total);
        }

        return {
          totals: totals.rows[0],
          alerts: {
            upcoming: upcoming.rows,
            overdue: overdue.rows,
            badgeCount: (upcoming.rowCount ?? 0) + (overdue.rowCount ?? 0)
          },
          quickDecision: {
            revenueCurrentMonth: Number(month.revenue_current ?? 0),
            revenueChangePct: pctChange(Number(month.revenue_current ?? 0), Number(month.revenue_previous ?? 0)),
            conversionCurrentPct: conversionCurrent,
            conversionChangePct: pctChange(conversionCurrent, conversionPrevious),
            avgTicketCurrent: Number(month.avg_ticket_current ?? 0),
            avgTicketChangePct: pctChange(Number(month.avg_ticket_current ?? 0), Number(month.avg_ticket_previous ?? 0)),
            avgFunnelDaysCurrent: Number(month.funnel_days_current ?? 0),
            avgFunnelDaysChangePct: pctChange(Number(month.funnel_days_current ?? 0), Number(month.funnel_days_previous ?? 0))
          },
          funnel: funnelMap,
          evolution: trend.rows,
          lossReasons: lossReasons.rows,
          operations: {
            tasks: tasks.rows[0],
            hotLeads: hotLeads.rows,
            meetings: meetings.rows,
            wonRecent: wonRecent.rows,
            dataQuality: dataQuality.rows[0]
          }
        };
      } finally {
        client.release();
      }
    }
  );

  app.get(
    "/api/alerts/followups",
    {
      preHandler: [app.authenticate]
    },
    async (request) => {
      const { days } = querySchema.parse(request.query);
      const client = await app.db.connect();

      try {
        const upcoming = await client.query(
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

        const overdue = await client.query(
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
      } finally {
        client.release();
      }
    }
  );
}
