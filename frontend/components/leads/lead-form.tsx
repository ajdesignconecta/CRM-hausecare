"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { maskPhone } from "@/lib/format";
import { Lead } from "@/types/lead";

const schema = z.object({
  company: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  email: z.string().email("Email invalido").optional().nullable().or(z.literal("")),
  site: z.string().max(220, "URL muito longa").optional().nullable().or(z.literal("")),
  maps_url: z.string().max(350, "URL muito longa").optional().nullable().or(z.literal("")),
  decisor_name_role: z.string().optional().nullable(),
  had_response: z.enum(["sim", "nao"]).nullable().optional(),
  lead_level: z.enum(["com_interesse", "sem_interesse", "nao_respondeu"]).nullable().optional(),
  temperature: z.enum(["frio", "morno", "quente"]).nullable().optional(),
  status: z
    .enum(["lead_novo", "em_contato", "reuniao_marcada", "proposta_enviada", "fechado", "perdido"])
    .optional(),
  deal_value: z.string().optional().nullable(),
  closed_at: z.string().optional().nullable(),
  lost_reason: z.string().optional().nullable(),
  next_action_date: z.string().optional().nullable(),
  next_action_note: z.string().optional().nullable(),
  first_contact_date: z.string().optional().nullable(),
  followup_date_1: z.string().optional().nullable(),
  followup_date_2: z.string().optional().nullable(),
  followup_date_3: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
});

type FormData = z.infer<typeof schema>;

const normalizeOptionalUrl = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return `https://${trimmed}`;
};

type Props = {
  initial?: Lead;
  onSubmit: (payload: any) => Promise<void>;
  submitLabel: string;
  mode?: "basic" | "full";
  onBack?: () => void;
};

const toDateInput = (value: string | null | undefined) => (value ? value.slice(0, 10) : "");

export function LeadForm({ initial, onSubmit, submitLabel, mode = "full", onBack }: Props) {
  const defaultValues = useMemo<FormData>(
    () => ({
      company: initial?.company ?? "",
      city: initial?.city ?? "",
      phone: initial?.phone ?? "",
      whatsapp: initial?.whatsapp ?? "",
      email: initial?.email ?? "",
      site: initial?.site ?? "",
      maps_url: initial?.maps_url ?? "",
      decisor_name_role: initial?.decisor_name_role ?? "",
      had_response: initial?.had_response ?? null,
      lead_level: initial?.lead_level ?? null,
      temperature: initial?.temperature ?? null,
      status: initial?.status ?? "lead_novo",
      deal_value: initial?.deal_value != null ? String(initial.deal_value) : "",
      closed_at: toDateInput(initial?.closed_at),
      lost_reason: initial?.lost_reason ?? "",
      next_action_date: toDateInput(initial?.next_action_date),
      next_action_note: initial?.next_action_note ?? "",
      first_contact_date: toDateInput(initial?.first_contact_date),
      followup_date_1: toDateInput(initial?.followup_date_1),
      followup_date_2: toDateInput(initial?.followup_date_2),
      followup_date_3: toDateInput(initial?.followup_date_3),
      notes: initial?.notes ?? ""
    }),
    [initial]
  );

  const { register, handleSubmit, setValue, formState } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues
  });

  return (
    <form
      className="grid grid-cols-1 gap-3 md:grid-cols-2"
      onSubmit={handleSubmit(async (data) => {
        await onSubmit({
          ...data,
          status: data.status ?? "lead_novo",
          company: data.company || null,
          email: data.email || null,
          site: normalizeOptionalUrl(data.site),
          maps_url: normalizeOptionalUrl(data.maps_url),
          city: data.city || null,
          phone: data.phone || null,
          whatsapp: data.whatsapp || null,
          decisor_name_role: data.decisor_name_role || null,
          temperature: data.temperature || null,
          deal_value: data.deal_value ? Number(data.deal_value) : null,
          closed_at: data.closed_at || null,
          lost_reason: data.lost_reason || null,
          next_action_date: data.next_action_date || null,
          next_action_note: data.next_action_note || null,
          first_contact_date: data.first_contact_date || null,
          followup_date_1: data.followup_date_1 || null,
          followup_date_2: data.followup_date_2 || null,
          followup_date_3: data.followup_date_3 || null,
          notes: data.notes || null
        });
      })}
    >
      <div className="md:col-span-2">
        <label className="mb-1 block text-sm font-medium">Empresa</label>
        <input {...register("company")} />
        <p className="mt-1 text-xs text-rose-600">{formState.errors.company?.message}</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Cidade</label>
        <input {...register("city")} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Telefone</label>
        <input {...register("phone")} onChange={(event) => setValue("phone", maskPhone(event.target.value))} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">WhatsApp</label>
        <input
          {...register("whatsapp")}
          onChange={(event) => setValue("whatsapp", maskPhone(event.target.value))}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Email</label>
        <input type="email" {...register("email")} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Site</label>
        <input {...register("site")} placeholder="https://" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Google Maps</label>
        <input {...register("maps_url")} placeholder="https://" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Decisor</label>
        <input {...register("decisor_name_role")} />
      </div>

      {mode === "basic" ? (
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium">Observacoes</label>
          <textarea rows={4} {...register("notes")} placeholder="Adicione observacoes importantes sobre este lead" />
        </div>
      ) : null}

      {mode === "full" ? (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium">Teve resposta</label>
            <select {...register("had_response")}>
              <option value="">-</option>
              <option value="sim">Sim</option>
              <option value="nao">Nao</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Nivel do lead</label>
            <select {...register("lead_level")}>
              <option value="">-</option>
              <option value="com_interesse">Com interesse</option>
              <option value="sem_interesse">Sem interesse</option>
              <option value="nao_respondeu">Nao respondeu</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Status</label>
            <select {...register("status")}>
              <option value="lead_novo">Lead novo</option>
              <option value="em_contato">Em contato</option>
              <option value="reuniao_marcada">Reuniao marcada</option>
              <option value="proposta_enviada">Proposta enviada</option>
              <option value="fechado">Fechado</option>
              <option value="perdido">Perdido</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Temperatura</label>
            <select {...register("temperature")}>
              <option value="">-</option>
              <option value="quente">Quente</option>
              <option value="morno">Morno</option>
              <option value="frio">Frio</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Valor do plano (R$)</label>
            <input type="number" step="0.01" min="0" {...register("deal_value")} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Data de fechamento</label>
            <input type="date" {...register("closed_at")} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Motivo de perda</label>
            <input {...register("lost_reason")} placeholder="Ex.: preco, sem interesse, sem retorno" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Proxima acao (data)</label>
            <input type="date" {...register("next_action_date")} />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium">Proxima acao (descricao)</label>
            <input {...register("next_action_note")} placeholder="Ex.: ligar amanha as 10h" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Primeiro contato</label>
            <input type="date" {...register("first_contact_date")} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Follow-up 1</label>
            <input type="date" {...register("followup_date_1")} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Follow-up 2</label>
            <input type="date" {...register("followup_date_2")} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Follow-up 3</label>
            <input type="date" {...register("followup_date_3")} />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium">Observacoes</label>
            <textarea rows={4} {...register("notes")} />
          </div>
        </>
      ) : null}

      <div className="md:col-span-2 flex justify-end gap-2">
        {onBack ? (
          <Button type="button" variant="secondary" onClick={onBack}>
            Voltar
          </Button>
        ) : null}
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
