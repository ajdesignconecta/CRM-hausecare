"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageBack } from "@/components/ui/page-back";
import { API_URL, apiFetch, apiUpload } from "@/lib/api";

type Report = {
  totalRows: number;
  imported: number;
  updated?: number;
  duplicates: number;
  invalid: number;
  dryRun?: boolean;
  duplicateMode?: "skip" | "update" | "merge_empty" | "allow";
  jobId?: string | null;
  previewRows?: Array<Record<string, string | null>>;
  detectedHeaders?: string[];
  resolvedHeaders?: string[];
  invalidPhoneCount?: number;
  skippedEmpty?: number;
  invalidRows: Array<{ row: number; reason: string }>;
};
type ImportJob = {
  id: string;
  file_name: string;
  status: string;
  total_rows: number;
  imported_count: number;
  duplicate_count: number;
  invalid_count: number;
  created_at: string;
  finished_at: string | null;
  created_by: string | null;
};

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [duplicateMode, setDuplicateMode] = useState<"skip" | "update" | "merge_empty" | "allow">("skip");
  const [defaultResponsible, setDefaultResponsible] = useState("");
  const [defaultStatus, setDefaultStatus] = useState("");
  const [defaultTemperature, setDefaultTemperature] = useState("");
  const [source, setSource] = useState("");
  const [campaign, setCampaign] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [preview, setPreview] = useState<Report | null>(null);
  const [jobs, setJobs] = useState<ImportJob[]>([]);

  const expectedHeaders = useMemo(
    () => ["Empresa", "Cidade", "Telefone", "WhatsApp", "Email", "Site", "Link Google Maps", "Decisor"],
    []
  );

  const buildQuery = (dryRun: boolean) => {
    const params = new URLSearchParams();
    params.set("skipDuplicates", String(skipDuplicates));
    params.set("duplicateMode", duplicateMode);
    params.set("dryRun", String(dryRun));
    if (defaultResponsible.trim()) params.set("defaultResponsible", defaultResponsible.trim());
    if (defaultStatus) params.set("defaultStatus", defaultStatus);
    if (defaultTemperature) params.set("defaultTemperature", defaultTemperature);
    if (source.trim()) params.set("source", source.trim());
    if (campaign.trim()) params.set("campaign", campaign.trim());
    return params.toString();
  };

  const loadJobs = async () => {
    try {
      const result = await apiFetch<{ items: ImportJob[] }>("/api/leads/import-jobs");
      setJobs(result.items);
    } catch {
      setJobs([]);
    }
  };

  useEffect(() => {
    loadJobs().catch(() => null);
  }, []);

  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setProgress((prev) => (prev >= 92 ? prev : prev + 4));
    }, 220);
    return () => clearInterval(interval);
  }, [loading]);

  const withUpload = async (fn: () => Promise<void>) => {
    setLoading(true);
    setProgress(8);
    try {
      await fn();
      setProgress(100);
    } finally {
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 250);
    }
  };

  const ensureFile = () => {
    if (!file) {
      toast.error("Selecione um arquivo CSV ou XLSX");
      return false;
    }
    return true;
  };

  const onPreview = async () => {
    if (!ensureFile()) return;
    const formData = new FormData();
    formData.append("file", file as File);
    await withUpload(async () => {
      const result = await apiUpload<Report>(`/api/leads/import-preview?${buildQuery(true)}`, formData);
      setPreview(result);
      toast.success("Preview gerado");
    });
  };

  const onImport = async (dryRun: boolean) => {
    if (!ensureFile()) return;
    const formData = new FormData();
    formData.append("file", file as File);
    await withUpload(async () => {
      const result = await apiUpload<Report>(`/api/leads/import?${buildQuery(dryRun)}`, formData);
      setReport(result);
      if (dryRun) {
        toast.success("Simulacao concluida");
      } else {
        toast.success("Importacao concluida");
        await loadJobs();
      }
    });
  };

  const onRevert = async (jobId: string) => {
    try {
      const result = await apiFetch<{ message: string }>(`/api/leads/import-jobs/${jobId}/revert`, {
        method: "POST"
      });
      toast.success(result.message);
      await loadJobs();
    } catch (error: any) {
      toast.error(error.message ?? "Erro ao reverter importacao");
    }
  };

  const downloadErrors = (jobId: string) => {
    window.open(`${API_URL}/api/leads/import-jobs/${jobId}/errors.csv`, "_blank");
  };

  const onDropFile = (event: any) => {
    event.preventDefault();
    setDragOver(false);
    const dropped = event.dataTransfer.files?.[0];
    if (!dropped) return;
    setFile(dropped);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-dark/70">Entrada de dados</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">Importacao de leads</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Use o modelo oficial para importar leads em lote com validacao automatica.
        </p>
      </div>
      <Card className="space-y-4">
        <div className="rounded-2xl border border-brand/30 bg-brand/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-brand-dark">Comece pelo modelo oficial</p>
              <p className="text-xs text-slate-600">
                Use este arquivo para importar rapidamente sem erro de estrutura.
              </p>
            </div>
            <a href="/crm-hausecare-leads.xlsx" download>
              <Button type="button" className="rounded-xl px-5 py-2.5">
                Baixar modelo Excel
              </Button>
            </a>
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-semibold">Regras do arquivo</p>
          <p className="mt-1">1. A primeira linha deve conter os cabecalhos exatos do modelo.</p>
          <p>2. Salve como XLSX ou CSV UTF-8.</p>
          <p>3. Nenhum campo e obrigatorio no modelo de importacao.</p>
        </div>

        <p className="text-sm text-slate-600">
          Cabecalhos esperados: Empresa, Cidade, Telefone, WhatsApp, Email, Site, Link Google Maps, Decisor.
        </p>

        <div
          className={`rounded-xl border-2 border-dashed p-4 text-sm transition ${dragOver ? "border-brand bg-emerald-50" : "border-slate-300 bg-slate-50"}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDropFile}
        >
          <p className="font-medium text-slate-700">Arraste e solte o arquivo aqui</p>
          <p className="mt-1 text-xs text-slate-500">Ou selecione manualmente abaixo.</p>
          {file ? <p className="mt-2 text-xs text-brand-dark">Arquivo selecionado: {file.name}</p> : null}
        </div>

        <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Estrategia para duplicados
            </label>
            <select value={duplicateMode} onChange={(e) => setDuplicateMode(e.target.value as any)}>
              <option value="skip">Pular duplicados</option>
              <option value="update">Atualizar existentes</option>
              <option value="merge_empty">Mesclar so campos vazios</option>
              <option value="allow">Permitir duplicados</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Responsavel padrao
            </label>
            <input
              value={defaultResponsible}
              onChange={(e) => setDefaultResponsible(e.target.value)}
              placeholder="Opcional"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Status inicial
            </label>
            <select value={defaultStatus} onChange={(e) => setDefaultStatus(e.target.value)}>
              <option value="">Sem forcar</option>
              <option value="lead_novo">Lead novo</option>
              <option value="em_contato">Em contato</option>
              <option value="reuniao_marcada">Reuniao marcada</option>
              <option value="proposta_enviada">Proposta enviada</option>
              <option value="fechado">Fechado</option>
              <option value="perdido">Perdido</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Temperatura inicial
            </label>
            <select value={defaultTemperature} onChange={(e) => setDefaultTemperature(e.target.value)}>
              <option value="">Sem forcar</option>
              <option value="quente">Quente</option>
              <option value="morno">Morno</option>
              <option value="frio">Frio</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Origem</label>
            <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Ex.: Meta Ads" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Campanha</label>
            <input value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="Ex.: Abril 2026" />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={skipDuplicates}
            onChange={(e) => setSkipDuplicates(e.target.checked)}
            className="size-4"
          />
          Pular duplicados
        </label>

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Processando arquivo</p>
            <div className="mt-2 h-2 rounded-full bg-slate-200">
              <div className="h-2 rounded-full bg-brand transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-xs text-slate-500">{progress}%</p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onPreview} disabled={loading}>
            Preview validacao
          </Button>
          <Button variant="secondary" onClick={() => onImport(true)} disabled={loading}>
            Simular importacao
          </Button>
          <Button onClick={() => onImport(false)} disabled={loading}>
            Importar agora
          </Button>
        </div>
      </Card>

      {preview ? (
        <Card>
          <h2 className="text-lg font-semibold">Preview e mapeamento</h2>
          <p className="mt-1 text-xs text-slate-500">
            Dry-run com analise de estrutura, duplicidade e qualidade dos dados.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
            <div>Total: {preview.totalRows}</div>
            <div>Duplicados: {preview.duplicates}</div>
            <div>Invalidos: {preview.invalid}</div>
            <div>Vazios ignorados: {preview.skippedEmpty ?? 0}</div>
            <div>Modo: {preview.duplicateMode ?? "-"}</div>
          </div>
          <div className="mt-3">
            <p className="text-sm font-semibold">Mapeamento detectado</p>
            <p className="mt-1 text-xs text-slate-500">
              Detectados: {(preview.detectedHeaders ?? []).join(", ") || "-"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Mapeados para modelo: {(preview.resolvedHeaders ?? []).join(", ") || "-"}
            </p>
            <p className="mt-1 text-xs text-slate-500">Esperados: {expectedHeaders.join(", ")}</p>
          </div>
          {preview.previewRows?.length ? (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[760px] text-xs">
                <thead className="text-left uppercase tracking-wide text-slate-500">
                  <tr>
                    {(preview.detectedHeaders ?? []).slice(0, 8).map((header) => (
                      <th key={header} className="border-b border-slate-200 px-2 py-2">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.previewRows.slice(0, 10).map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-100">
                      {(preview.detectedHeaders ?? []).slice(0, 8).map((header) => (
                        <td key={`${idx}-${header}`} className="px-2 py-2 text-slate-700">
                          {row[header] ?? "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </Card>
      ) : null}

      {report ? (
        <Card>
          <h2 className="text-lg font-semibold">Relatorio de importacao</h2>
          <div className="mt-2 grid grid-cols-2 gap-3 text-sm md:grid-cols-6">
            <div>Total: {report.totalRows}</div>
            <div>Importados: {report.imported}</div>
            <div>Atualizados: {report.updated ?? 0}</div>
            <div>Duplicados: {report.duplicates}</div>
            <div>Invalidos: {report.invalid}</div>
            <div>Numeros invalidos: {report.invalidPhoneCount ?? 0}</div>
            <div>Vazios ignorados: {report.skippedEmpty ?? 0}</div>
          </div>
          {report.jobId ? (
            <p className="mt-2 text-xs text-slate-500">Job ID: {report.jobId}</p>
          ) : null}
          <ul className="mt-4 space-y-1 text-xs text-rose-600">
            {report.invalidRows.map((item) => (
              <li key={`${item.row}-${item.reason}`}>Linha {item.row}: {item.reason}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card>
        <h2 className="text-lg font-semibold">Historico de importacoes</h2>
        <p className="mt-1 text-xs text-slate-500">Auditoria de jobs com relatorio de erros e opcao de reversao.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-2 py-2">Arquivo</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Totais</th>
                <th className="px-2 py-2">Criado em</th>
                <th className="px-2 py-2 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-t border-slate-100">
                  <td className="px-2 py-2">
                    <p className="font-medium">{job.file_name}</p>
                    <p className="text-xs text-slate-500">{job.created_by ?? "Usuario"}</p>
                  </td>
                  <td className="px-2 py-2">{job.status}</td>
                  <td className="px-2 py-2 text-xs text-slate-600">
                    total {job.total_rows} | importados {job.imported_count} | duplicados {job.duplicate_count} |
                    invalidos {job.invalid_count}
                  </td>
                  <td className="px-2 py-2 text-xs text-slate-600">
                    {new Date(job.created_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-8 px-2 text-xs"
                        onClick={() => downloadErrors(job.id)}
                      >
                        Erros CSV
                      </Button>
                      {job.status !== "reverted" ? (
                        <Button
                          type="button"
                          variant="danger"
                          className="h-8 px-2 text-xs"
                          onClick={() => onRevert(job.id)}
                        >
                          Reverter
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <PageBack fallbackHref="/leads" />
    </div>
  );
}
