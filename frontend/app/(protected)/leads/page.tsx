"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { formatDateBr, formatDateTimeBr } from "@/lib/format";
import { Lead, ListResponse } from "@/types/lead";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { PageBack } from "@/components/ui/page-back";

type Filters = {
  search: string;
  status: string;
  city: string;
  responsible: string;
  lead_level: string;
  had_response: string;
  temperature: string;
  imported_date: string;
  next_due_in_days: string;
  missing_phone: boolean;
  missing_decisor: boolean;
  missing_followup: boolean;
  min_deal_value: string;
  max_deal_value: string;
};

type LeadActivity = {
  id: string;
  action: string;
  details:
    | {
        changedFields?: Array<{ field: string; from: string; to: string }>;
        note?: string;
        attachment?: { name: string; data_url: string } | null;
      }
    | null;
  created_at: string;
  actor_name: string | null;
};
type FunnelSummaryResponse = {
  items: Array<{ status: Lead["status"]; count: number; total_value: number }>;
};
type CurrentUserMinimal = {
  role?: "admin" | "user";
};

type ViewMode = "table" | "kanban";
type SortBy =
  | "lead_number"
  | "company"
  | "city"
  | "status"
  | "temperature"
  | "created_at"
  | "first_contact_date"
  | "next_action_date"
  | "deal_value";
type SortDir = "asc" | "desc";
type SavedFilterPreset = {
  name: string;
  filters: Filters;
  sortBy: SortBy;
  sortDir: SortDir;
};

const defaultFilters: Filters = {
  search: "",
  status: "",
  city: "",
  responsible: "",
  lead_level: "",
  had_response: "",
  temperature: "",
  imported_date: "",
  next_due_in_days: "",
  missing_phone: false,
  missing_decisor: false,
  missing_followup: false,
  min_deal_value: "",
  max_deal_value: ""
};

const levelLabel: Record<string, string> = {
  com_interesse: "Com interesse",
  sem_interesse: "Sem interesse",
  nao_respondeu: "Nao respondeu"
};

const responseLabel: Record<string, string> = {
  sim: "Sim",
  nao: "Nao"
};

const temperatureLabel: Record<string, string> = {
  quente: "Quente",
  morno: "Morno",
  frio: "Frio"
};

const statusLabel: Record<Lead["status"], string> = {
  lead_novo: "Lead novo",
  em_contato: "Em contato",
  reuniao_marcada: "Reuniao marcada",
  proposta_enviada: "Proposta enviada",
  fechado: "Fechado",
  perdido: "Perdido"
};

const statusOrder: Lead["status"][] = [
  "lead_novo",
  "em_contato",
  "reuniao_marcada",
  "proposta_enviada",
  "fechado",
  "perdido"
];
const statusToneClass: Record<Lead["status"], string> = {
  lead_novo: "border-l-slate-300",
  em_contato: "border-l-sky-400",
  reuniao_marcada: "border-l-amber-400",
  proposta_enviada: "border-l-violet-400",
  fechado: "border-l-emerald-500",
  perdido: "border-l-rose-500"
};

const getWhatsappHref = (value: string | null) => {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  const withCountry = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${withCountry}`;
};

const getWebsiteHref = (value: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const activityLabel: Record<string, string> = {
  created: "Lead criado",
  updated: "Lead atualizado",
  imported: "Importado em lote",
  note: "Nota adicionada"
};
const LEADS_PRESETS_KEY = "leads_filter_presets_v1";
const LEADS_VIEW_MODE_KEY = "leads_view_mode_v1";
const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Nao foi possivel ler o anexo"));
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(file);
  });

export default function LeadsPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [data, setData] = useState<ListResponse<Lead>>({
    items: [],
    meta: { page: 1, pageSize: 10, total: 0 }
  });
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkTemperature, setBulkTemperature] = useState("");
  const [bulkNextActionDate, setBulkNextActionDate] = useState("");
  const [bulkResponsible, setBulkResponsible] = useState("");
  const [drawerLead, setDrawerLead] = useState<Lead | null>(null);
  const [drawerSaving, setDrawerSaving] = useState(false);
  const [drawerHistory, setDrawerHistory] = useState<LeadActivity[]>([]);
  const [drawerHistoryLoading, setDrawerHistoryLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<Lead["status"] | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>("lead_number");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [presetName, setPresetName] = useState("");
  const [savedPresets, setSavedPresets] = useState<SavedFilterPreset[]>([]);
  const [noteText, setNoteText] = useState("");
  const [noteAttachment, setNoteAttachment] = useState<{ name: string; data_url: string } | null>(null);
  const [userRole, setUserRole] = useState<"admin" | "user">("admin");
  const [pageSize, setPageSize] = useState(10);
  const [activeRowIndex, setActiveRowIndex] = useState(0);
  const [funnelSummary, setFunnelSummary] = useState<FunnelSummaryResponse["items"]>(
    statusOrder.map((status) => ({ status, count: 0, total_value: 0 }))
  );
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const appendFilterParams = (params: URLSearchParams, appliedFilters: Filters) => {
    if (appliedFilters.search) params.set("search", appliedFilters.search);
    if (appliedFilters.status) params.set("status", appliedFilters.status);
    if (appliedFilters.city) params.set("city", appliedFilters.city);
    if (appliedFilters.responsible) params.set("responsible", appliedFilters.responsible);
    if (appliedFilters.lead_level) params.set("lead_level", appliedFilters.lead_level);
    if (appliedFilters.had_response) params.set("had_response", appliedFilters.had_response);
    if (appliedFilters.temperature) params.set("temperature", appliedFilters.temperature);
    if (appliedFilters.imported_date) params.set("imported_date", appliedFilters.imported_date);
    if (appliedFilters.next_due_in_days) params.set("next_due_in_days", appliedFilters.next_due_in_days);
    if (appliedFilters.missing_phone) params.set("missing_phone", "true");
    if (appliedFilters.missing_decisor) params.set("missing_decisor", "true");
    if (appliedFilters.missing_followup) params.set("missing_followup", "true");
    if (appliedFilters.min_deal_value) params.set("min_deal_value", appliedFilters.min_deal_value);
    if (appliedFilters.max_deal_value) params.set("max_deal_value", appliedFilters.max_deal_value);
  };

  const load = async (
    page = data.meta.page,
    appliedFilters: Filters = filters,
    appliedSortBy: SortBy = sortBy,
    appliedSortDir: SortDir = sortDir
  ) => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize)
    });
    appendFilterParams(params, appliedFilters);
    params.set("sort_by", appliedSortBy);
    params.set("sort_dir", appliedSortDir);

    const summaryParams = new URLSearchParams();
    appendFilterParams(summaryParams, { ...appliedFilters, status: "" });

    const [result, summary] = await Promise.all([
      apiFetch<ListResponse<Lead>>(`/api/leads?${params.toString()}`),
      apiFetch<FunnelSummaryResponse>(`/api/leads/funnel-summary?${summaryParams.toString()}`)
    ]);
    setData(result);
    setFunnelSummary(summary.items);
  };

  const clearFilters = async () => {
    setFilters(defaultFilters);
    await load(1, defaultFilters);
  };

  const savePreset = () => {
    const name = presetName.trim();
    if (!name) {
      toast.error("Informe um nome para salvar o filtro");
      return;
    }
    const next = [
      ...savedPresets.filter((preset) => preset.name !== name),
      { name, filters, sortBy, sortDir }
    ];
    setSavedPresets(next);
    localStorage.setItem(LEADS_PRESETS_KEY, JSON.stringify(next));
    setPresetName("");
    toast.success("Filtro salvo");
  };

  const applyPreset = async (name: string) => {
    const preset = savedPresets.find((item) => item.name === name);
    if (!preset) return;
    const presetFilters = { ...defaultFilters, ...preset.filters };
    setFilters(presetFilters);
    setSortBy(preset.sortBy);
    setSortDir(preset.sortDir);
    await load(1, presetFilters, preset.sortBy, preset.sortDir);
  };

  const removePreset = (name: string) => {
    const next = savedPresets.filter((item) => item.name !== name);
    setSavedPresets(next);
    localStorage.setItem(LEADS_PRESETS_KEY, JSON.stringify(next));
    toast.success("Filtro removido");
  };

  const removeFilterChip = async (key: keyof Filters) => {
    const resetValue =
      typeof defaultFilters[key] === "boolean" ? (false as Filters[keyof Filters]) : ("" as Filters[keyof Filters]);
    const nextFilters = { ...filters, [key]: resetValue } as Filters;
    setFilters(nextFilters);
    await load(1, nextFilters);
  };

  const sortedItems = [...data.items].sort((a, b) => a.lead_number - b.lead_number);
  const groupedByStatus = useMemo(() => {
    const map: Record<Lead["status"], Lead[]> = {
      lead_novo: [],
      em_contato: [],
      reuniao_marcada: [],
      proposta_enviada: [],
      fechado: [],
      perdido: []
    };
    for (const item of sortedItems) map[item.status].push(item);
    return map;
  }, [sortedItems]);
  const stageSummary = useMemo(
    () => statusOrder.map((status) => funnelSummary.find((item) => item.status === status) ?? { status, count: 0, total_value: 0 }),
    [funnelSummary]
  );
  const allVisibleSelected = sortedItems.length > 0 && sortedItems.every((lead) => selectedIds.includes(lead.id));
  const activeFilterChips = useMemo(
    () =>
      [
        filters.search ? { key: "search", label: `Busca: ${filters.search}` } : null,
        filters.status ? { key: "status", label: `Status: ${filters.status}` } : null,
        filters.city ? { key: "city", label: `Cidade: ${filters.city}` } : null,
        filters.responsible ? { key: "responsible", label: `Responsavel: ${filters.responsible}` } : null,
        filters.lead_level ? { key: "lead_level", label: `Nivel: ${filters.lead_level}` } : null,
        filters.had_response ? { key: "had_response", label: `Resposta: ${filters.had_response}` } : null,
        filters.temperature ? { key: "temperature", label: `Temperatura: ${filters.temperature}` } : null,
        filters.imported_date ? { key: "imported_date", label: `Importado: ${filters.imported_date}` } : null,
        filters.next_due_in_days ? { key: "next_due_in_days", label: `Vence em ${filters.next_due_in_days}d` } : null,
        filters.missing_phone ? { key: "missing_phone", label: "Sem telefone" } : null,
        filters.missing_decisor ? { key: "missing_decisor", label: "Sem decisor" } : null,
        filters.missing_followup ? { key: "missing_followup", label: "Sem follow-up" } : null,
        filters.min_deal_value ? { key: "min_deal_value", label: `Valor >= ${filters.min_deal_value}` } : null,
        filters.max_deal_value ? { key: "max_deal_value", label: `Valor <= ${filters.max_deal_value}` } : null
      ].filter(Boolean) as Array<{ key: keyof Filters; label: string }>,
    [filters]
  );

  const handleDelete = async () => {
    if (!deleteLeadId) return;

    await apiFetch<{ message: string }>(`/api/leads/${deleteLeadId}`, {
      method: "DELETE"
    });

    toast.success("Lead excluido");
    setDeleteLeadId(null);
    setSelectedIds((prev) => prev.filter((id) => id !== deleteLeadId));
    await load(1);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    const response = await apiFetch<{ message: string; deletedCount: number }>("/api/leads/bulk-delete", {
      method: "POST",
      body: JSON.stringify({ ids: selectedIds })
    });

    toast.success(response.message);
    setBulkDeleteOpen(false);
    setSelectedIds([]);
    await load(1);
  };

  const handleBulkUpdate = async () => {
    if (selectedIds.length === 0) return;
    if (!bulkStatus && !bulkTemperature && !bulkNextActionDate && !bulkResponsible.trim()) {
      toast.error("Defina ao menos um campo para atualizar em massa");
      return;
    }

    const payload: Record<string, unknown> = { ids: selectedIds };
    if (bulkStatus) payload.status = bulkStatus;
    if (bulkTemperature) payload.temperature = bulkTemperature;
    if (bulkNextActionDate) payload.next_action_date = bulkNextActionDate;
    if (bulkResponsible.trim()) payload.responsible = bulkResponsible.trim();

    const response = await apiFetch<{ message: string; updatedCount: number }>("/api/leads/bulk-update", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    toast.success(response.message);
    setBulkStatus("");
    setBulkTemperature("");
    setBulkNextActionDate("");
    setBulkResponsible("");
    setSelectedIds([]);
    await load(1);
  };

  const handleExportSelected = async () => {
    if (selectedIds.length === 0) return;
    try {
      const response = await fetch("/api/leads/export-selected.csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ids: selectedIds })
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Falha ao exportar selecionados");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "leads-selecionados.csv";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success("Exportacao concluida");
    } catch (error: any) {
      toast.error(error.message ?? "Erro ao exportar selecionados");
    }
  };

  const toggleSelectLead = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !sortedItems.some((lead) => lead.id === id)));
      return;
    }

    setSelectedIds((prev) => {
      const merged = new Set(prev);
      sortedItems.forEach((lead) => merged.add(lead.id));
      return Array.from(merged);
    });
  };

  const updateDrawerLead = <K extends keyof Lead>(field: K, value: Lead[K]) => {
    setDrawerLead((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const saveDrawerLead = async () => {
    if (!drawerLead) return;
    setDrawerSaving(true);
    try {
      const updated = await apiFetch<Lead>(`/api/leads/${drawerLead.id}`, {
        method: "PUT",
        body: JSON.stringify(drawerLead)
      });
      setDrawerLead(updated);
      setData((prev) => ({
        ...prev,
        items: prev.items.map((item) => (item.id === updated.id ? updated : item))
      }));
      setDrawerHistoryLoading(true);
      const history = await apiFetch<{ items: LeadActivity[] }>(`/api/leads/${updated.id}/activity`);
      setDrawerHistory(history.items);
      toast.success("Lead atualizado");
    } catch (error: any) {
      toast.error(error.message ?? "Erro ao atualizar lead");
    } finally {
      setDrawerHistoryLoading(false);
      setDrawerSaving(false);
    }
  };

  const moveLeadStatus = async (leadId: string, status: Lead["status"]) => {
    const lead = data.items.find((item) => item.id === leadId);
    if (!lead || lead.status === status) return;

    try {
      const updated = await apiFetch<Lead>(`/api/leads/${lead.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      setData((prev) => ({
        ...prev,
        items: prev.items.map((item) => (item.id === updated.id ? updated : item))
      }));
      if (drawerLead?.id === updated.id) {
        setDrawerLead(updated);
      }
      toast.success("Status atualizado");
    } catch (error: any) {
      toast.error(error.message ?? "Erro ao mover lead");
    }
  };

  const addDrawerNote = async () => {
    if (!drawerLead?.id) return;
    const trimmed = noteText.trim();
    if (!trimmed) {
      toast.error("Escreva uma nota antes de salvar");
      return;
    }
    try {
      await apiFetch<{ message: string }>(`/api/leads/${drawerLead.id}/activity-note`, {
        method: "POST",
        body: JSON.stringify({
          note: trimmed,
          attachment: noteAttachment
        })
      });
      setNoteText("");
      setNoteAttachment(null);
      setDrawerHistoryLoading(true);
      const history = await apiFetch<{ items: LeadActivity[] }>(`/api/leads/${drawerLead.id}/activity`);
      setDrawerHistory(history.items);
      toast.success("Nota adicionada");
    } catch (error: any) {
      toast.error(error.message ?? "Erro ao adicionar nota");
    } finally {
      setDrawerHistoryLoading(false);
    }
  };

  useEffect(() => {
    load(1).catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("leads_scroll_y");
      if (!raw) return;
      const y = Number(raw);
      if (!Number.isFinite(y)) return;
      window.scrollTo({ top: y, behavior: "auto" });
      sessionStorage.removeItem("leads_scroll_y");
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = (target?.tagName || "").toLowerCase();
      const isTyping = tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable;
      if (isTyping) return;

      if (event.key === "n" || event.key === "N") {
        event.preventDefault();
        router.push("/leads/new");
        return;
      }
      if (event.key === "/") {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (event.key === "j" || event.key === "J") {
        event.preventDefault();
        setActiveRowIndex((prev) => Math.min(sortedItems.length - 1, prev + 1));
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveRowIndex((prev) => Math.min(sortedItems.length - 1, prev + 1));
        return;
      }
      if (event.key === "k" || event.key === "K") {
        event.preventDefault();
        setActiveRowIndex((prev) => Math.max(0, prev - 1));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveRowIndex((prev) => Math.max(0, prev - 1));
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const lead = sortedItems[activeRowIndex];
        if (lead) setDrawerLead(lead);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeRowIndex, router, sortedItems]);

  useEffect(() => {
    apiFetch<CurrentUserMinimal>("/api/auth/me")
      .then((me) => setUserRole(me.role === "user" ? "user" : "admin"))
      .catch(() => setUserRole("admin"));
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LEADS_PRESETS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SavedFilterPreset[];
      if (Array.isArray(parsed)) setSavedPresets(parsed);
    } catch {
      setSavedPresets([]);
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LEADS_VIEW_MODE_KEY);
      if (raw === "table" || raw === "kanban") {
        setViewMode(raw);
      }
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LEADS_VIEW_MODE_KEY, viewMode);
    } catch {
      // no-op
    }
  }, [viewMode]);

  useEffect(() => {
    if (!drawerLead?.id) {
      setDrawerHistory([]);
      setNoteText("");
      setNoteAttachment(null);
      return;
    }

    setDrawerHistoryLoading(true);
    apiFetch<{ items: LeadActivity[] }>(`/api/leads/${drawerLead.id}/activity`)
      .then((result) => setDrawerHistory(result.items))
      .catch(() => setDrawerHistory([]))
      .finally(() => setDrawerHistoryLoading(false));
  }, [drawerLead?.id]);

  useEffect(() => {
    if (!drawerLead) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerLead]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-dark/70">Pipeline comercial</p>
            <h1 className="mt-2 text-2xl font-bold text-ink md:text-3xl">Leads</h1>
            <p className="mt-1.5 max-w-2xl text-sm text-slate-600">
              Busque, filtre e acompanhe cada lead do seu funil de vendas.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="h-9"
              onClick={() => setViewMode((prev) => (prev === "table" ? "kanban" : "table"))}
            >
              {viewMode === "table" ? "Ver Kanban" : "Ver Tabela"}
            </Button>
            <Link href="/leads/import">
              <Button variant="secondary" className="h-9">Importar CSV</Button>
            </Link>
            <Link href="/leads/new">
              <Button className="h-9">Novo lead</Button>
            </Link>
          </div>
        </div>
      </div>

      <Card className="border border-slate-200/90 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Resumo do funil</p>
          <span className="hidden text-xs text-slate-500 md:inline">Clique para filtrar por etapa</span>
        </div>
        <div className="mb-3 grid grid-cols-2 gap-2 xl:grid-cols-6">
          {stageSummary.map((stage) => (
            <button
              key={stage.status}
              type="button"
              aria-label={`Filtrar etapa ${statusLabel[stage.status]}`}
              onClick={async () => {
                const next = { ...filters, status: stage.status };
                setFilters(next);
                await load(1, next);
              }}
              className={`rounded-xl border border-l-4 px-3 py-2 text-left transition ${statusToneClass[stage.status]} ${
                filters.status === stage.status
                  ? "border-brand bg-emerald-50 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                  : "border-slate-200 bg-white hover:border-brand/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
              }`}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {statusLabel[stage.status]}
              </p>
              <p className="mt-1 text-xl font-bold text-ink">{stage.count}</p>
              <p className="text-xs text-slate-600">
                {stage.total_value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-[2fr_repeat(6,minmax(0,1fr))]">
          <input
            ref={searchInputRef}
            className="h-9"
            aria-label="Buscar por empresa, email ou telefone"
            placeholder="Buscar por empresa, email ou telefone"
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          />
          <select
            className="h-9"
            aria-label="Filtrar por status"
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
          >
            <option value="">Status</option>
            <option value="lead_novo">Lead novo</option>
            <option value="em_contato">Em contato</option>
            <option value="reuniao_marcada">Reuniao marcada</option>
            <option value="proposta_enviada">Proposta enviada</option>
            <option value="fechado">Fechado</option>
            <option value="perdido">Perdido</option>
          </select>
          <input
            className="h-9"
            aria-label="Filtrar por cidade"
            placeholder="Cidade"
            value={filters.city}
            onChange={(e) => setFilters((prev) => ({ ...prev, city: e.target.value }))}
          />
          <select
            className="h-9"
            aria-label="Filtrar por nivel"
            value={filters.lead_level}
            onChange={(e) => setFilters((prev) => ({ ...prev, lead_level: e.target.value }))}
          >
            <option value="">Nivel</option>
            <option value="com_interesse">Com interesse</option>
            <option value="sem_interesse">Sem interesse</option>
            <option value="nao_respondeu">Nao respondeu</option>
          </select>
          <select
            className="h-9"
            aria-label="Filtrar por resposta"
            value={filters.had_response}
            onChange={(e) => setFilters((prev) => ({ ...prev, had_response: e.target.value }))}
          >
            <option value="">Teve resposta</option>
            <option value="sim">Sim</option>
            <option value="nao">Nao</option>
          </select>
          <select
            className="h-9"
            aria-label="Filtrar por temperatura"
            value={filters.temperature}
            onChange={(e) => setFilters((prev) => ({ ...prev, temperature: e.target.value }))}
          >
            <option value="">Temperatura</option>
            <option value="quente">Quente</option>
            <option value="morno">Morno</option>
            <option value="frio">Frio</option>
          </select>
          <input
            className="h-9"
            type="date"
            aria-label="Filtrar por data de importacao"
            value={filters.imported_date}
            onChange={(e) => setFilters((prev) => ({ ...prev, imported_date: e.target.value }))}
          />
        </div>
        <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-[180px_140px_140px_170px_1fr_1fr]">
          <input
            className="h-9"
            type="number"
            min="0"
            aria-label="Filtrar por vencimento em ate X dias"
            placeholder="Vence em ate X dias"
            value={filters.next_due_in_days}
            onChange={(e) => setFilters((prev) => ({ ...prev, next_due_in_days: e.target.value }))}
          />
          <input
            className="h-9"
            type="number"
            min="0"
            step="0.01"
            aria-label="Filtrar por valor minimo"
            placeholder="Valor min"
            value={filters.min_deal_value}
            onChange={(e) => setFilters((prev) => ({ ...prev, min_deal_value: e.target.value }))}
          />
          <input
            className="h-9"
            type="number"
            min="0"
            step="0.01"
            aria-label="Filtrar por valor maximo"
            placeholder="Valor max"
            value={filters.max_deal_value}
            onChange={(e) => setFilters((prev) => ({ ...prev, max_deal_value: e.target.value }))}
          />
          <input
            className="h-9"
            aria-label="Filtrar por responsavel"
            placeholder="Responsavel"
            value={filters.responsible}
            onChange={(e) => setFilters((prev) => ({ ...prev, responsible: e.target.value }))}
          />
          <label className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm">
            <input
              type="checkbox"
              checked={filters.missing_phone}
              onChange={(e) => setFilters((prev) => ({ ...prev, missing_phone: e.target.checked }))}
              className="size-4"
            />
            Sem telefone
          </label>
          <div className="flex gap-2">
            <label className="flex h-9 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm">
              <input
                type="checkbox"
                checked={filters.missing_decisor}
                onChange={(e) => setFilters((prev) => ({ ...prev, missing_decisor: e.target.checked }))}
                className="size-4"
              />
              Sem decisor
            </label>
            <label className="flex h-9 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm">
              <input
                type="checkbox"
                checked={filters.missing_followup}
                onChange={(e) => setFilters((prev) => ({ ...prev, missing_followup: e.target.checked }))}
                className="size-4"
              />
              Sem follow-up
            </label>
          </div>
        </div>
        {activeFilterChips.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {activeFilterChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                aria-label={`Remover filtro ${chip.label}`}
                className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                onClick={() => removeFilterChip(chip.key)}
              >
                {chip.label} x
              </button>
            ))}
            <Button variant="secondary" className="h-7 px-3 text-xs" onClick={() => clearFilters()}>
              Limpar tudo
            </Button>
          </div>
        ) : null}
        <div className="mt-3 grid grid-cols-1 gap-2.5 xl:grid-cols-[1fr_auto]">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="h-9 min-w-[170px]"
              aria-label="Campo de ordenacao"
            >
              <option value="lead_number">Ordenar: Numero</option>
              <option value="company">Empresa</option>
              <option value="city">Cidade</option>
              <option value="status">Status</option>
              <option value="temperature">Temperatura</option>
              <option value="created_at">Importado em</option>
              <option value="first_contact_date">1o contato</option>
              <option value="next_action_date">Proxima acao</option>
              <option value="deal_value">Valor</option>
            </select>
            <select value={sortDir} onChange={(e) => setSortDir(e.target.value as SortDir)} className="h-9 min-w-[120px]" aria-label="Direcao da ordenacao">
              <option value="asc">Crescente</option>
              <option value="desc">Decrescente</option>
            </select>
            <input
              placeholder="Salvar filtro como..."
              aria-label="Nome do filtro salvo"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              className="h-9 min-w-[180px]"
            />
            <Button variant="secondary" className="h-9 px-3" onClick={savePreset}>
              Salvar filtro
            </Button>
            <select onChange={(e) => applyPreset(e.target.value)} defaultValue="" className="h-9 min-w-[180px]" aria-label="Aplicar filtro salvo">
              <option value="" disabled>
                Filtros salvos
              </option>
              {savedPresets.map((preset) => (
                <option key={preset.name} value={preset.name}>
                  {preset.name}
                </option>
              ))}
            </select>
            {savedPresets.length > 0 ? (
              <Button
                variant="secondary"
                className="h-9 px-3"
                onClick={() => removePreset(savedPresets[savedPresets.length - 1].name)}
              >
                Remover ultimo salvo
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" className="h-9 min-w-[100px]" onClick={() => clearFilters()}>
            Limpar
          </Button>
          <Button className="h-9 min-w-[100px]" onClick={() => load(1)}>Filtrar</Button>
          </div>
        </div>
      </Card>

      {viewMode === "table" ? (
      <Card className="overflow-x-auto border border-slate-200/90 p-0 shadow-sm">
        {selectedIds.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-3 py-2.5">
            <p className="text-sm font-semibold text-slate-700">{selectedIds.length} lead(s) selecionado(s)</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" className="h-9 px-3" onClick={handleExportSelected}>
                Exportar selecionados
              </Button>
              {userRole === "admin" ? (
                <>
                  <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} className="h-9 min-w-[150px]">
                    <option value="">Mover etapa...</option>
                    <option value="lead_novo">Lead novo</option>
                    <option value="em_contato">Em contato</option>
                    <option value="reuniao_marcada">Reuniao marcada</option>
                    <option value="proposta_enviada">Proposta enviada</option>
                    <option value="fechado">Fechado</option>
                    <option value="perdido">Perdido</option>
                  </select>
                  <select value={bulkTemperature} onChange={(e) => setBulkTemperature(e.target.value)} className="h-9 min-w-[140px]">
                    <option value="">Temperatura...</option>
                    <option value="quente">Quente</option>
                    <option value="morno">Morno</option>
                    <option value="frio">Frio</option>
                  </select>
                  <input
                    type="date"
                    value={bulkNextActionDate}
                    onChange={(e) => setBulkNextActionDate(e.target.value)}
                    className="h-9 min-w-[150px]"
                  />
                  <input
                    placeholder="Atribuir responsavel"
                    value={bulkResponsible}
                    onChange={(e) => setBulkResponsible(e.target.value)}
                    className="h-9 min-w-[170px]"
                  />
                  <Button variant="secondary" className="h-9 px-3" onClick={handleBulkUpdate}>
                    Aplicar
                  </Button>
                  <Button variant="danger" className="h-9 px-3" onClick={() => setBulkDeleteOpen(true)}>
                    Excluir selecionados
                  </Button>
                </>
              ) : (
                <p className="text-xs text-slate-500">Sem permissao para editar em massa.</p>
              )}
            </div>
          </div>
        ) : null}
        <table className="w-full table-fixed text-[12px]">
          <thead className="sticky top-0 z-10 bg-slate-100/95 text-left text-[11px] uppercase tracking-wide text-slate-600 backdrop-blur">
            <tr>
              <th className="sticky left-0 z-20 w-10 bg-slate-50 px-2 py-3">
                <input
                  type="checkbox"
                  aria-label="Selecionar todos os leads visiveis"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAllVisible}
                />
              </th>
              <th className="w-10 px-2 py-3">#</th>
              <th className="w-[180px] px-2 py-3">Empresa</th>
              <th className="w-[120px] px-2 py-3">Cidade</th>
              <th className="w-[92px] px-2 py-3">Responsavel</th>
              <th className="w-[128px] px-2 py-3">Contatos</th>
              <th className="w-[130px] px-2 py-3">Pipeline</th>
              <th className="w-[82px] px-2 py-3">Prox. acao</th>
              <th className="w-[72px] px-2 py-3">Valor</th>
              <th className="w-[96px] px-2 py-3">Ultima interacao</th>
              <th className="w-[82px] px-2 py-3">1o contato</th>
              <th className="w-[82px] px-2 py-3">Follow-up 1</th>
              <th className="w-[96px] px-2 py-3">Importado em</th>
              <th className="w-[82px] px-2 py-3 text-right">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((lead, rowIndex) => (
              <tr
                key={lead.id}
                className={`cursor-pointer border-t border-slate-200/70 align-top hover:bg-slate-50 ${rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/50"} ${
                  rowIndex === activeRowIndex ? "ring-1 ring-brand/40" : ""
                }`}
                onClick={() => setDrawerLead(lead)}
              >
                <td className={`sticky left-0 z-[1] px-2 py-2.5 ${rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}>
                  <input
                    type="checkbox"
                    aria-label={`Selecionar lead ${lead.lead_number}`}
                    checked={selectedIds.includes(lead.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleSelectLead(lead.id)}
                  />
                </td>
                <td className="px-2 py-2.5 text-base font-semibold text-ink">{lead.lead_number}</td>
                <td className="px-2 py-2.5">
                  <p className="truncate font-semibold text-ink">{lead.company ?? "-"}</p>
                  <p className="mt-1 text-xs text-slate-500">{lead.decisor_name_role ?? "Sem decisor cadastrado"}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {!lead.phone ? <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">Sem telefone</span> : null}
                    {!lead.decisor_name_role ? <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">Sem decisor</span> : null}
                    {!lead.next_action_date && !lead.followup_date_1 ? (
                      <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] text-rose-700">Sem follow-up</span>
                    ) : null}
                  </div>
                </td>
                <td className="px-2 py-2.5 text-slate-700">{lead.city ?? "-"}</td>
                <td className="px-2 py-2.5 text-slate-700">{lead.decisor_name_role ?? "-"}</td>
                <td className="px-2 py-2.5">
                  <div className="space-y-1 text-slate-700">
                    <p>
                      Tel:{" "}
                      {lead.phone ? (
                        <a
                          href={getWhatsappHref(lead.phone) ?? "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand-dark underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {lead.phone}
                        </a>
                      ) : (
                        "-"
                      )}
                    </p>
                    <p>
                      Whats:{" "}
                      {lead.whatsapp ? (
                        <a
                          href={getWhatsappHref(lead.whatsapp) ?? "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand-dark underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {lead.whatsapp}
                        </a>
                      ) : (
                        "-"
                      )}
                    </p>
                    <p>Email: {lead.email ?? "-"}</p>
                    <p>
                      Site:{" "}
                      {lead.site ? (
                        <a
                          href={getWebsiteHref(lead.site) ?? "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand-dark underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Abrir site
                        </a>
                      ) : (
                        "-"
                      )}
                    </p>
                  </div>
                </td>
                <td className="px-2 py-2.5">
                  <div className="space-y-2">
                    <StatusBadge status={lead.status} />
                    <p className="text-xs text-slate-600">
                      Resposta: {lead.had_response ? responseLabel[lead.had_response] : "Nao informado"}
                    </p>
                    <p className="text-xs text-slate-600">
                      Nivel: {lead.lead_level ? levelLabel[lead.lead_level] : "Nao informado"}
                    </p>
                    <p className="text-xs text-slate-600">
                      Temperatura: {lead.temperature ? temperatureLabel[lead.temperature] : "Nao informado"}
                    </p>
                  </div>
                </td>
                <td className="px-2 py-2.5 text-slate-700">{formatDateBr(lead.next_action_date)}</td>
                <td className="px-2 py-2.5 text-slate-700">
                  {lead.deal_value != null
                    ? lead.deal_value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                    : "-"}
                </td>
                <td className="px-2 py-2.5 text-slate-700">{formatDateTimeBr(lead.updated_at)}</td>
                <td className="px-2 py-2.5 text-slate-700">{formatDateBr(lead.first_contact_date)}</td>
                <td className="px-2 py-2.5 text-slate-700">{formatDateBr(lead.followup_date_1)}</td>
                <td className="px-2 py-2.5 text-slate-700">{formatDateTimeBr(lead.created_at)}</td>
                <td className="px-2 py-2.5">
                  <div className="flex justify-end gap-2">
                    {userRole === "admin" ? (
                      <Button
                        type="button"
                        variant="danger"
                        className="h-8 px-2.5 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteLeadId(lead.id);
                        }}
                      >
                        Excluir
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-6">
          {statusOrder.map((status) => (
            <Card
              key={status}
              className={`min-h-[320px] p-3 transition ${dragOverStatus === status ? "border-brand bg-emerald-50/60 shadow-soft" : ""}`}
              onDragEnter={(e) => {
                e.preventDefault();
                if (draggingLeadId) setDragOverStatus(status);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={() => {
                if (dragOverStatus === status) setDragOverStatus(null);
              }}
              onDrop={async (e) => {
                e.preventDefault();
                const leadId = e.dataTransfer.getData("text/plain");
                setDragOverStatus(null);
                setDraggingLeadId(null);
                await moveLeadStatus(leadId, status);
              }}
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{statusLabel[status]}</p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {groupedByStatus[status].length}
                </span>
              </div>
              <div className="space-y-2">
                {groupedByStatus[status].map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", lead.id);
                      e.dataTransfer.effectAllowed = "move";
                      setDraggingLeadId(lead.id);
                    }}
                    onDragEnd={() => {
                      setDraggingLeadId(null);
                      setDragOverStatus(null);
                    }}
                    className={`rounded-lg border p-3 text-sm ${draggingLeadId === lead.id ? "border-brand bg-emerald-50" : "border-slate-200 bg-white"}`}
                  >
                    <p className="font-semibold text-ink">#{lead.lead_number} - {lead.company ?? "Sem empresa"}</p>
                    <p className="mt-1 text-xs text-slate-500">{lead.city ?? "Sem cidade"}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Temp: {lead.temperature ? temperatureLabel[lead.temperature] : "Nao informado"}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Button variant="secondary" className="h-8 px-2 text-xs" onClick={() => setDrawerLead(lead)}>
                        Painel
                      </Button>
                      <Button variant="secondary" className="h-8 px-2 text-xs" onClick={() => router.push(`/leads/${lead.id}`)}>
                        Abrir
                      </Button>
                    </div>
                    <div className="mt-2">
                      <select
                        aria-label={`Mover lead ${lead.lead_number} para outra etapa`}
                        value={lead.status}
                        onChange={async (e) => {
                          const next = e.target.value as Lead["status"];
                          await moveLeadStatus(lead.id, next);
                        }}
                        className="h-8 text-xs"
                      >
                        <option value="lead_novo">Lead novo</option>
                        <option value="em_contato">Em contato</option>
                        <option value="reuniao_marcada">Reuniao marcada</option>
                        <option value="proposta_enviada">Proposta enviada</option>
                        <option value="fechado">Fechado</option>
                        <option value="perdido">Perdido</option>
                      </select>
                    </div>
                  </div>
                ))}
                {groupedByStatus[status].length === 0 ? (
                  <p className="text-xs text-slate-400">Sem leads nesta etapa.</p>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-sm">
        <p className="text-slate-600">
          Pagina {data.meta.page} de {Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize))}
        </p>
        <div className="flex gap-2">
          <select
            value={String(pageSize)}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="h-10 min-w-[120px] rounded-xl"
          >
            <option value="10">10 / pagina</option>
            <option value="25">25 / pagina</option>
            <option value="50">50 / pagina</option>
            <option value="100">100 / pagina</option>
          </select>
          <PageBack
            className="pt-0"
            buttonClassName="h-10 min-w-[120px] justify-center"
            fallbackHref="/dashboard"
          />
          <Button variant="secondary" className="h-10 min-w-[120px] justify-center" onClick={() => load(Math.max(1, data.meta.page - 1))}>
            Anterior
          </Button>
          <Button
            variant="secondary"
            className="h-10 min-w-[120px] justify-center"
            onClick={() => load(Math.min(Math.ceil(data.meta.total / data.meta.pageSize), data.meta.page + 1))}
          >
            Proxima
          </Button>
        </div>
      </div>

      <ConfirmModal
        open={Boolean(deleteLeadId)}
        title="Excluir lead"
        message="Esta acao nao pode ser desfeita. Deseja continuar?"
        onClose={() => setDeleteLeadId(null)}
        onConfirm={handleDelete}
      />
      <ConfirmModal
        open={bulkDeleteOpen}
        title="Excluir leads selecionados"
        message={`Voce vai excluir ${selectedIds.length} lead(s). Essa acao nao pode ser desfeita.`}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
      />

      {drawerLead ? (
        <>
          <button
            type="button"
            aria-label="Fechar painel"
            className="fixed inset-0 z-40 bg-slate-900/35"
            onClick={() => setDrawerLead(null)}
          />
          <aside className="fixed right-0 top-0 z-50 flex h-screen w-[400px] max-w-[100vw] flex-col border-l border-slate-200 bg-white shadow-2xl sm:w-[430px]">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Lead #{drawerLead.lead_number}</p>
                <h2 className="text-base font-semibold leading-tight text-ink sm:text-lg">{drawerLead.company ?? "Sem empresa"}</h2>
              </div>
              <button
                type="button"
                className="rounded-md border border-slate-200 px-3 py-1.5 text-xs sm:text-sm"
                onClick={() => setDrawerLead(null)}
              >
                Fechar
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 text-xs sm:text-sm [&_input]:text-sm [&_select]:text-sm [&_textarea]:text-sm">
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Acoes rapidas</p>
                <div className="flex flex-wrap gap-2">
                  {drawerLead.phone ? (
                    <a
                      href={getWhatsappHref(drawerLead.phone) ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-brand-dark underline sm:text-sm"
                    >
                      Ligar no Whats
                    </a>
                  ) : null}
                  {drawerLead.whatsapp ? (
                    <a
                      href={getWhatsappHref(drawerLead.whatsapp) ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-brand-dark underline sm:text-sm"
                    >
                      WhatsApp
                    </a>
                  ) : null}
                  {drawerLead.site ? (
                    <a
                      href={getWebsiteHref(drawerLead.site) ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-brand-dark underline sm:text-sm"
                    >
                      Site
                    </a>
                  ) : null}
                </div>
                {!drawerLead.phone || !drawerLead.decisor_name_role || (!drawerLead.next_action_date && !drawerLead.followup_date_1) ? (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2">
                    <p className="text-xs font-semibold text-amber-700">Dados pendentes</p>
                    <p className="text-xs text-amber-700">Complete telefone, decisor e follow-up para melhorar a conversao.</p>
                    <Button
                      variant="secondary"
                      className="mt-2 h-7 px-2 text-xs"
                      onClick={() => router.push(`/leads/${drawerLead.id}`)}
                    >
                      Completar dados
                    </Button>
                  </div>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status</label>
                <select value={drawerLead.status} onChange={(e) => updateDrawerLead("status", e.target.value as Lead["status"])}>
                  <option value="lead_novo">Lead novo</option>
                  <option value="em_contato">Em contato</option>
                  <option value="reuniao_marcada">Reuniao marcada</option>
                  <option value="proposta_enviada">Proposta enviada</option>
                  <option value="fechado">Fechado</option>
                  <option value="perdido">Perdido</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Temperatura</label>
                <select
                  value={drawerLead.temperature ?? ""}
                  onChange={(e) => updateDrawerLead("temperature", (e.target.value || null) as Lead["temperature"])}
                >
                  <option value="">Nao informado</option>
                  <option value="quente">Quente</option>
                  <option value="morno">Morno</option>
                  <option value="frio">Frio</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Valor do plano (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={drawerLead.deal_value ?? ""}
                  onChange={(e) => updateDrawerLead("deal_value", e.target.value ? Number(e.target.value) : null)}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Data de fechamento</label>
                <input
                  type="date"
                  value={drawerLead.closed_at ? drawerLead.closed_at.slice(0, 10) : ""}
                  onChange={(e) => updateDrawerLead("closed_at", e.target.value || null)}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Proxima acao (data)</label>
                <input
                  type="date"
                  value={drawerLead.next_action_date ? drawerLead.next_action_date.slice(0, 10) : ""}
                  onChange={(e) => updateDrawerLead("next_action_date", e.target.value || null)}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Proxima acao (descricao)</label>
                <textarea
                  rows={3}
                  value={drawerLead.next_action_note ?? ""}
                  onChange={(e) => updateDrawerLead("next_action_note", e.target.value || null)}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Motivo de perda</label>
                <input
                  value={drawerLead.lost_reason ?? ""}
                  onChange={(e) => updateDrawerLead("lost_reason", e.target.value || null)}
                  placeholder="Ex.: preco, sem retorno, sem fit"
                />
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Observacao do lead</p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-7 px-2 text-[11px]"
                    onClick={() => updateDrawerLead("notes", null)}
                  >
                    Limpar
                  </Button>
                </div>
                <textarea
                  rows={3}
                  value={drawerLead.notes ?? ""}
                  onChange={(e) => updateDrawerLead("notes", e.target.value || null)}
                  placeholder="Observacoes gerais deste lead"
                />
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Nova nota</p>
                <textarea
                  rows={3}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Escreva observacoes importantes sobre este lead"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    className="w-full text-xs sm:w-auto"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const data_url = await fileToDataUrl(file);
                        setNoteAttachment({ name: file.name, data_url });
                      } catch (error: any) {
                        toast.error(error.message ?? "Erro ao anexar arquivo");
                      }
                    }}
                  />
                  {noteAttachment ? <span className="text-xs text-slate-500">Anexo: {noteAttachment.name}</span> : null}
                  <Button className="h-8 px-3 text-xs" onClick={addDrawerNote}>
                    Adicionar nota
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Historico</p>
                {drawerHistoryLoading ? <p className="text-xs text-slate-500">Carregando historico...</p> : null}
                {!drawerHistoryLoading && drawerHistory.length === 0 ? (
                  <p className="text-xs text-slate-500">Sem atividades registradas.</p>
                ) : null}
                <ul className="space-y-2">
                  {drawerHistory.map((item) => (
                    <li key={item.id} className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                      <p className="text-xs font-semibold text-slate-700">{activityLabel[item.action] ?? item.action}</p>
                      <p className="text-xs text-slate-500">
                        {item.actor_name ?? "Sistema"} · {formatDateTimeBr(item.created_at)}
                      </p>
                      {item.details?.note ? <p className="mt-1 text-xs text-slate-700">{item.details.note}</p> : null}
                      {item.details?.attachment?.data_url ? (
                        <a
                          className="mt-1 inline-block text-xs text-brand-dark underline"
                          href={item.details.attachment.data_url}
                          download={item.details.attachment.name || "anexo"}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Anexo: {item.details.attachment.name || "abrir"}
                        </a>
                      ) : null}
                      {item.details?.changedFields?.length ? (
                        <ul className="mt-1 space-y-0.5 text-[11px] text-slate-600">
                          {item.details.changedFields.slice(0, 4).map((change) => (
                            <li key={`${item.id}-${change.field}`}>
                              <span className="font-semibold">{change.field}</span>: {change.from} → {change.to}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="sticky bottom-0 flex flex-col gap-2 border-t border-slate-200 bg-white px-4 pb-6 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                variant="secondary"
                className="w-full text-xs sm:w-auto sm:text-sm"
                onClick={() => router.push(`/leads/${drawerLead.id}`)}
              >
                Abrir pagina completa
              </Button>
              <Button className="w-full text-xs sm:w-auto sm:text-sm" onClick={saveDrawerLead} disabled={drawerSaving}>
                {drawerSaving ? "Salvando..." : "Salvar alteracoes"}
              </Button>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}
