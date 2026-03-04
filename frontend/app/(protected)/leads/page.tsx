"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { formatDateBr } from "@/lib/format";
import { Lead, ListResponse } from "@/types/lead";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";

type Filters = {
  search: string;
  status: string;
  city: string;
  lead_level: string;
  had_response: string;
};

export default function LeadsPage() {
  const [filters, setFilters] = useState<Filters>({
    search: "",
    status: "",
    city: "",
    lead_level: "",
    had_response: ""
  });
  const [data, setData] = useState<ListResponse<Lead>>({
    items: [],
    meta: { page: 1, pageSize: 10, total: 0 }
  });

  const load = async (page = data.meta.page) => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: "10"
    });

    if (filters.search) params.set("search", filters.search);
    if (filters.status) params.set("status", filters.status);
    if (filters.city) params.set("city", filters.city);
    if (filters.lead_level) params.set("lead_level", filters.lead_level);
    if (filters.had_response) params.set("had_response", filters.had_response);

    const result = await apiFetch<ListResponse<Lead>>(`/api/leads?${params.toString()}`);
    setData(result);
  };

  useEffect(() => {
    load(1).catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-ink">Leads</h1>
        <div className="flex gap-2">
          <Link href="/leads/import">
            <Button variant="secondary">Importar CSV</Button>
          </Link>
          <Link href="/leads/new">
            <Button>Novo lead</Button>
          </Link>
        </div>
      </div>

      <Card>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-6">
          <input
            placeholder="Buscar por empresa, email ou telefone"
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            className="md:col-span-2"
          />
          <select value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}>
            <option value="">Status</option>
            <option value="lead_novo">Lead novo</option>
            <option value="em_contato">Em contato</option>
            <option value="reuniao_marcada">Reunião marcada</option>
            <option value="proposta_enviada">Proposta enviada</option>
            <option value="fechado">Fechado</option>
            <option value="perdido">Perdido</option>
          </select>
          <input
            placeholder="Cidade"
            value={filters.city}
            onChange={(e) => setFilters((prev) => ({ ...prev, city: e.target.value }))}
          />
          <select
            value={filters.lead_level}
            onChange={(e) => setFilters((prev) => ({ ...prev, lead_level: e.target.value }))}
          >
            <option value="">Nível</option>
            <option value="com_interesse">Com interesse</option>
            <option value="sem_interesse">Sem interesse</option>
            <option value="nao_respondeu">Não respondeu</option>
          </select>
          <select
            value={filters.had_response}
            onChange={(e) => setFilters((prev) => ({ ...prev, had_response: e.target.value }))}
          >
            <option value="">Teve resposta</option>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>
        </div>
        <div className="mt-2 flex justify-end">
          <Button onClick={() => load(1)}>Filtrar</Button>
        </div>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Empresa</th>
              <th className="px-3 py-2">Cidade</th>
              <th className="px-3 py-2">Telefone</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Follow-up 1</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((lead) => (
              <tr key={lead.id} className="border-t border-slate-100">
                <td className="px-3 py-2">{lead.lead_number}</td>
                <td className="px-3 py-2 font-medium">{lead.company}</td>
                <td className="px-3 py-2">{lead.city ?? "-"}</td>
                <td className="px-3 py-2">{lead.phone ?? "-"}</td>
                <td className="px-3 py-2">{lead.email ?? "-"}</td>
                <td className="px-3 py-2"><StatusBadge status={lead.status} /></td>
                <td className="px-3 py-2">{formatDateBr(lead.followup_date_1)}</td>
                <td className="px-3 py-2 text-right">
                  <Link href={`/leads/${lead.id}`} className="text-brand-dark underline">
                    Ver / editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="flex items-center justify-between text-sm">
        <p className="text-slate-600">
          Página {data.meta.page} de {Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize))}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => load(Math.max(1, data.meta.page - 1))}>
            Anterior
          </Button>
          <Button
            variant="secondary"
            onClick={() => load(Math.min(Math.ceil(data.meta.total / data.meta.pageSize), data.meta.page + 1))}
          >
            Próxima
          </Button>
        </div>
      </div>
    </div>
  );
}
