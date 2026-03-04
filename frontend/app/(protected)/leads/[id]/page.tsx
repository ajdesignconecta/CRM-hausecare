"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { LeadForm } from "@/components/leads/lead-form";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { Lead } from "@/types/lead";

export default function LeadDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    apiFetch<Lead>(`/api/leads/${params.id}`)
      .then(setLead)
      .catch((error) => toast.error(error.message));
  }, [params.id]);

  if (!lead) {
    return <Card>Carregando lead...</Card>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Lead #{lead.lead_number}</h1>
        <div className="flex gap-2">
          {lead.whatsapp ? (
            <a
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium"
              href={`https://wa.me/${lead.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
            >
              Abrir WhatsApp
            </a>
          ) : null}
          {lead.site ? (
            <a
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium"
              href={lead.site}
              target="_blank"
            >
              Abrir site
            </a>
          ) : null}
          {lead.maps_url ? (
            <a
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium"
              href={lead.maps_url}
              target="_blank"
            >
              Abrir Maps
            </a>
          ) : null}
        </div>
      </div>

      <Card>
        <LeadForm
          initial={lead}
          submitLabel="Salvar altera��es"
          onSubmit={async (payload) => {
            try {
              const updated = await apiFetch<Lead>(`/api/leads/${params.id}`, {
                method: "PUT",
                body: JSON.stringify(payload)
              });
              setLead(updated);
              toast.success("Lead atualizado");
            } catch (error: any) {
              toast.error(error.message ?? "Erro ao atualizar");
            }
          }}
        />
      </Card>

      <div className="flex justify-between">
        <Link href="/leads" className="text-sm text-brand-dark underline">
          Voltar para lista
        </Link>
        <Button variant="danger" onClick={() => setShowDelete(true)}>
          Excluir lead
        </Button>
      </div>

      <ConfirmModal
        open={showDelete}
        title="Excluir lead"
        message="Esta a��o n�o pode ser desfeita."
        onClose={() => setShowDelete(false)}
        onConfirm={async () => {
          await apiFetch(`/api/leads/${params.id}`, { method: "DELETE" });
          toast.success("Lead removido");
          router.push("/leads");
        }}
      />
    </div>
  );
}
