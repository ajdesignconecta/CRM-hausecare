"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiUpload } from "@/lib/api";

type Report = {
  totalRows: number;
  imported: number;
  duplicates: number;
  invalid: number;
  invalidRows: Array<{ row: number; reason: string }>;
};

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [report, setReport] = useState<Report | null>(null);

  const onImport = async () => {
    if (!file) {
      toast.error("Selecione um arquivo CSV");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const result = await apiUpload<Report>(`/api/leads/import?skipDuplicates=${skipDuplicates}`, formData);
      setReport(result);
      toast.success("Importação concluída");
    } catch (error: any) {
      toast.error(error.message ?? "Erro na importação");
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Importar leads por CSV</h1>
      <Card className="space-y-3">
        <p className="text-sm text-slate-600">
          Colunas esperadas: Lead #, Empresa, Cidade, Telefone, WhatsApp, Email, Site, Link Google Maps,
          Decisor, Status do Contato, Data Primeiro Contato, Follow-up 1, Follow-up 2, Follow-up 3,
          Observações, Teve resposta, Nível do lead.
        </p>
        <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={skipDuplicates}
            onChange={(e) => setSkipDuplicates(e.target.checked)}
            className="size-4"
          />
          Pular duplicados
        </label>
        <Button onClick={onImport}>Importar</Button>
      </Card>

      {report ? (
        <Card>
          <h2 className="text-lg font-semibold">Relatório de importação</h2>
          <div className="mt-2 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <div>Total: {report.totalRows}</div>
            <div>Importados: {report.imported}</div>
            <div>Duplicados: {report.duplicates}</div>
            <div>Inválidos: {report.invalid}</div>
          </div>
          <ul className="mt-4 space-y-1 text-xs text-rose-600">
            {report.invalidRows.map((item) => (
              <li key={`${item.row}-${item.reason}`}>Linha {item.row}: {item.reason}</li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
