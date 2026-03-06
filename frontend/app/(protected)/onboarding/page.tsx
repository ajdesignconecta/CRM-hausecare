"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

const steps = [
  {
    title: "Defina seu pipeline",
    description: "Personalize etapas e status conforme seu processo comercial."
  },
  {
    title: "Importe os primeiros leads",
    description: "Use a planilha modelo para acelerar o inicio da operacao."
  },
  {
    title: "Ative alertas de follow-up",
    description: "Configure rotina para nao perder oportunidades por atraso."
  }
];

export default function OnboardingPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-dark/70">Onboarding</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">Configure sua operacao em menos de 5 minutos</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Siga este checklist para entrar em producao com padrao SaaS de alta performance.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {steps.map((step, index) => (
          <div key={step.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/70">Passo {index + 1}</p>
            <h2 className="mt-2 text-lg font-bold text-ink">{step.title}</h2>
            <p className="mt-2 text-sm text-slate-500">{step.description}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="text-sm text-emerald-900">
          Quando concluir o setup inicial, finalize para liberar o dashboard principal para toda a equipe.
        </p>
        <Button
          className="mt-4 rounded-2xl px-6 py-3 text-base"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              await apiFetch("/api/auth/onboarding-status", {
                method: "PUT",
                body: JSON.stringify({ completed: true, step: 5 })
              });
              toast.success("Onboarding concluido");
              router.replace("/dashboard");
            } catch (error: any) {
              toast.error(error.message ?? "Erro ao finalizar onboarding");
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Finalizando..." : "Finalizar onboarding"}
        </Button>
      </div>
    </div>
  );
}
