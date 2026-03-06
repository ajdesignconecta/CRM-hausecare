"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { PageBack } from "@/components/ui/page-back";
import { apiFetch } from "@/lib/api";
import { formatDateBr } from "@/lib/format";

type AlertItem = {
  id: string;
  lead_number: number;
  company: string;
  followup_date: string;
  followup_kind: string;
  status: string;
};

type EvolutionItem = {
  week_start: string;
  entradas: number;
  reunioes: number;
  propostas: number;
  fechados: number;
};

type LossReason = {
  reason: string;
  total: number;
};

type DashboardSummary = {
  totals: {
    total: number;
    com_interesse: number;
    reunioes: number;
    propostas: number;
    fechados: number;
  };
  alerts: {
    upcoming: AlertItem[];
    overdue: AlertItem[];
  };
  quickDecision: {
    revenueCurrentMonth: number;
    revenueChangePct: number;
    conversionCurrentPct: number;
    conversionChangePct: number;
    avgTicketCurrent: number;
    avgTicketChangePct: number;
    avgFunnelDaysCurrent: number;
    avgFunnelDaysChangePct: number;
  };
  funnel: Record<string, number>;
  evolution: EvolutionItem[];
  lossReasons: LossReason[];
  operations: {
    tasks: {
      today_due: number;
      overdue: number;
      stale_without_contact: number;
    };
    hotLeads: Array<{ id: string; lead_number: number; company: string | null; status: string }>;
    meetings: Array<{ id: string; lead_number: number; company: string | null; next_action_date: string | null; followup_date_1: string | null }>;
    wonRecent: Array<{ id: string; lead_number: number; company: string | null; deal_value: number | null; closed_at: string | null; updated_at: string }>;
    dataQuality: {
      without_phone: number;
      without_decisor: number;
      without_city: number;
    };
  };
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const metricClass = (value: number) => {
  if (value > 0) return "text-emerald-600";
  if (value < 0) return "text-rose-600";
  return "text-slate-500";
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [onboardingReady, setOnboardingReady] = useState<boolean | null>(null);
  const [loadingOnboarding, setLoadingOnboarding] = useState(true);

  useEffect(() => {
    apiFetch<{ completed: boolean }>("/api/auth/onboarding-status")
      .then((status) => setOnboardingReady(status.completed))
      .catch(() => setOnboardingReady(true))
      .finally(() => setLoadingOnboarding(false));
  }, []);

  useEffect(() => {
    if (onboardingReady === false) {
      window.location.href = "/onboarding";
    }
  }, [onboardingReady]);

  useEffect(() => {
    if (onboardingReady !== true) return;
    apiFetch<DashboardSummary>("/api/dashboard/summary")
      .then(setSummary)
      .catch(() => setSummary(null));
  }, [onboardingReady]);

  const topCards = useMemo(() => {
    if (!summary) return [];
    return [
      { title: "Receita prevista (mes)", value: currency.format(summary.quickDecision.revenueCurrentMonth), delta: summary.quickDecision.revenueChangePct, suffix: "%" },
      { title: "Taxa de conversao", value: `${summary.quickDecision.conversionCurrentPct.toFixed(1)}%`, delta: summary.quickDecision.conversionChangePct, suffix: " pp" },
      { title: "Ticket medio", value: currency.format(summary.quickDecision.avgTicketCurrent), delta: summary.quickDecision.avgTicketChangePct, suffix: "%" },
      { title: "Tempo medio no funil", value: `${summary.quickDecision.avgFunnelDaysCurrent.toFixed(1)} dias`, delta: summary.quickDecision.avgFunnelDaysChangePct, suffix: "%" }
    ];
  }, [summary]);

  const funnelEntries = useMemo(() => {
    if (!summary) return [] as Array<{ key: string; label: string; value: number; pct: number }>;
    const labels: Record<string, string> = {
      lead_novo: "Lead novo",
      em_contato: "Em contato",
      reuniao_marcada: "Reuniao marcada",
      proposta_enviada: "Proposta enviada",
      fechado: "Fechado",
      perdido: "Perdido"
    };

    const max = Math.max(1, ...Object.values(summary.funnel));
    return Object.entries(labels).map(([key, label]) => {
      const value = summary.funnel[key] ?? 0;
      return { key, label, value, pct: Math.max(8, Math.round((value / max) * 100)) };
    });
  }, [summary]);

  if (loadingOnboarding || onboardingReady === false) {
    return <Card>Validando onboarding...</Card>;
  }

  if (!summary) {
    return <Card>Carregando dashboard...</Card>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-dark/70">Visao geral</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">Dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">Painel tatico para priorizar operacao, acompanhar vendas e remover gargalos do funil.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        {topCards.map((card) => (
          <Card key={card.title}>
            <p className="text-xs uppercase tracking-wide text-slate-500">{card.title}</p>
            <p className="mt-2 text-2xl font-bold text-brand-dark">{card.value}</p>
            <p className={`mt-1 text-xs font-semibold ${metricClass(card.delta)}`}>{card.delta >= 0 ? "+" : ""}{card.delta.toFixed(1)}{card.suffix} vs periodo anterior</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <h2 className="text-lg font-semibold">Funil por etapa</h2>
          <div className="mt-4 space-y-3">
            {funnelEntries.map((item) => (
              <div key={item.key}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{item.label}</span>
                  <span className="font-semibold text-slate-700">{item.value}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-brand" style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <h2 className="text-lg font-semibold">Evolucao semanal</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <caption className="sr-only">Tabela de evolucao semanal de entradas, reunioes, propostas e fechados</caption>
              <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="py-2">Semana</th>
                  <th scope="col" className="py-2">Entradas</th>
                  <th scope="col" className="py-2">Reunioes</th>
                  <th scope="col" className="py-2">Propostas</th>
                  <th scope="col" className="py-2">Fechados</th>
                </tr>
              </thead>
              <tbody>
                {summary.evolution.map((row) => (
                  <tr key={row.week_start} className="border-t border-slate-100">
                    <td className="py-2">{formatDateBr(row.week_start)}</td>
                    <td className="py-2">{row.entradas}</td>
                    <td className="py-2">{row.reunioes}</td>
                    <td className="py-2">{row.propostas}</td>
                    <td className="py-2 font-semibold text-emerald-700">{row.fechados}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">Motivos de perda (Top 5)</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {summary.lossReasons.length === 0 ? <li className="text-slate-500">Sem dados ainda.</li> : null}
            {summary.lossReasons.map((item) => (
              <li key={item.reason} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                <span>{item.reason}</span>
                <span className="font-semibold text-rose-700">{item.total}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">Operacao de hoje</h2>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-xl border border-slate-200 p-3"><p className="text-xs text-slate-500">Hoje</p><p className="text-xl font-bold">{summary.operations.tasks.today_due}</p></div>
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3"><p className="text-xs text-rose-600">Atrasados</p><p className="text-xl font-bold text-rose-700">{summary.operations.tasks.overdue}</p></div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3"><p className="text-xs text-amber-700">Sem contato</p><p className="text-xl font-bold text-amber-700">{summary.operations.tasks.stale_without_contact}</p></div>
          </div>
          <div className="mt-4 text-xs text-slate-500">
            Qualidade dos dados: sem telefone {summary.operations.dataQuality.without_phone} | sem decisor {summary.operations.dataQuality.without_decisor} | sem cidade {summary.operations.dataQuality.without_city}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card>
          <h2 className="text-lg font-semibold">Leads quentes</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {summary.operations.hotLeads.length === 0 ? <li className="text-slate-500">Sem leads quentes.</li> : null}
            {summary.operations.hotLeads.map((lead) => (
              <li key={lead.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                <span>#{lead.lead_number} - {lead.company ?? "Sem empresa"}</span>
                <Link
                  className="text-brand-dark underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                  href={`/leads/${lead.id}`}
                  aria-label={`Abrir lead ${lead.lead_number}`}
                >
                  Abrir
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">Reunioes agendadas</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {summary.operations.meetings.length === 0 ? <li className="text-slate-500">Sem reunioes.</li> : null}
            {summary.operations.meetings.map((lead) => (
              <li key={lead.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                <span>#{lead.lead_number} - {lead.company ?? "Sem empresa"}</span>
                <span className="text-slate-500">{formatDateBr(lead.next_action_date ?? lead.followup_date_1)}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">Comprou (recentes)</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {summary.operations.wonRecent.length === 0 ? <li className="text-slate-500">Sem fechamentos.</li> : null}
            {summary.operations.wonRecent.map((lead) => (
              <li key={lead.id} className="rounded-xl border border-slate-200 px-3 py-2">
                <p className="font-semibold">#{lead.lead_number} - {lead.company ?? "Sem empresa"}</p>
                <p className="text-xs text-slate-500">{formatDateBr(lead.closed_at ?? lead.updated_at)}</p>
                <p className="text-sm font-semibold text-emerald-700">{currency.format(lead.deal_value ?? 0)}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">Follow-ups a vencer (7 dias)</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {summary.alerts.upcoming.length === 0 ? <li className="text-slate-500">Nenhum follow-up proximo</li> : null}
            {summary.alerts.upcoming.map((item) => (
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
            {summary.alerts.overdue.length === 0 ? <li className="text-slate-500">Nenhum follow-up atrasado</li> : null}
            {summary.alerts.overdue.map((item) => (
              <li key={`${item.id}-${item.followup_kind}`} className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                <p className="font-semibold">#{item.lead_number} - {item.company}</p>
                <p className="text-rose-600">{formatDateBr(item.followup_date)}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <PageBack />
    </div>
  );
}
