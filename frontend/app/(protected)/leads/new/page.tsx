"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LeadForm } from "@/components/leads/lead-form";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";

export default function NewLeadPage() {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Novo lead</h1>
      <Card>
        <LeadForm
          submitLabel="Salvar lead"
          onSubmit={async (payload) => {
            try {
              await apiFetch("/api/leads", { method: "POST", body: JSON.stringify(payload) });
              toast.success("Lead criado");
              router.push("/leads");
            } catch (error: any) {
              toast.error(error.message ?? "Erro ao criar lead");
            }
          }}
        />
      </Card>
    </div>
  );
}
