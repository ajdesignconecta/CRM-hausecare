"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { formatDateBr } from "@/lib/format";
import { Lead, ListResponse } from "@/types/lead";

type AlertItem = {
  id: string;
  lead_number: number;
  company: string;
  followup_date: string;
  followup_kind: string;
  status: string;
};

type AlertsResponse = {
  upcoming: AlertItem[];
  overdue: AlertItem[];
};

export default function DashboardPage() {
  const [totals, setTotals] = useState({
    total: 0,
    comInteresse: 0,
    reunioes: 0,
    propostas: 0,
    fechados: 0
  });
  const [alerts, setAlerts] = useState<AlertsResponse>({ upcoming: [], overdue: [] });

  useEffect(() => {
    const load = async () => {
      const [total, comInteresse, reunioes, propostas, fechados, followups] = await Promise.all([
        apiFetch<ListResponse<Lead>>("/api/leads?page=1&pageSize=1"),
        apiFetch<ListResponse<Lead>>("/api/leads?page=1&pageSize=1&lead_level=com_interesse"),
        apiFetch<ListResponse<Lead>>("/api/leads?page=1&pageSize=1&status=reuniao_marcada"),
        apiFetch<ListResponse<Lead>>("/api/leads?page=1&pageSize=1&status=proposta_enviada"),
        apiFetch<ListResponse<Lead>>("/api/leads?page=1&pageSize=1&status=fechado"),
        apiFetch<AlertsResponse>("/api/alerts/followups")
      ]);

      setTotals({
        total: total.meta.total,
        comInteresse: comInteresse.meta.total,
        reunioes: reunioes.meta.total,
        propostas: propostas.meta.total,
        fechados: fechados.meta.total
      });
      setAlerts(followups);
    };

    load().catch(() => null);
  }, []);

  const cards = useMemo(
    () => [
      { title: "Total leads", value: totals.total },
      { title: "Com interesse", value: totals.comInteresse },
      { title: "Reuniões marcadas", value: totals.reunioes },
      { title: "Propostas enviadas", value: totals.propostas },
      { title: "Fechados", value: totals.fechados }
    ],
    [totals]
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
        {cards.map((card) => (
          <Card key={card.title}>
            <p className="text-xs uppercase tracking-wide text-slate-500">{card.title}</p>
            <p className="mt-2 text-3xl font-bold text-brand-dark">{card.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">Follow-ups a vencer (7 dias)</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {alerts.upcoming.length === 0 ? <li className="text-slate-500">Nenhum follow-up próximo</li> : null}
            {alerts.upcoming.map((item) => (
              <li key={`${item.id}-${item.followup_kind}`} className="rounded-xl border border-slate-200 p-3">
                <p className="font-semibold">#{item.lead_number} - {item.company}</p>
                <p className="text-slate-500">{formatDateBr(item.followup_date)}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">Atrasados</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {alerts.overdue.length === 0 ? <li className="text-slate-500">Nenhum follow-up atrasado</li> : null}
            {alerts.overdue.map((item) => (
              <li key={`${item.id}-${item.followup_kind}`} className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                <p className="font-semibold">#{item.lead_number} - {item.company}</p>
                <p className="text-rose-600">{formatDateBr(item.followup_date)}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
