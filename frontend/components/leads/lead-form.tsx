"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { maskPhone } from "@/lib/format";
import { Lead } from "@/types/lead";

const schema = z.object({
  company: z.string().min(2, "Empresa obrigatória"),
  city: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  email: z.string().email("Email inválido").optional().nullable().or(z.literal("")),
  site: z.string().url("URL inválida").optional().nullable().or(z.literal("")),
  maps_url: z.string().url("URL inválida").optional().nullable().or(z.literal("")),
  decisor_name_role: z.string().optional().nullable(),
  had_response: z.enum(["sim", "nao"]).nullable().optional(),
  lead_level: z.enum(["com_interesse", "sem_interesse", "nao_respondeu"]).nullable().optional(),
  status: z.enum(["lead_novo", "em_contato", "reuniao_marcada", "proposta_enviada", "fechado", "perdido"]),
  first_contact_date: z.string().optional().nullable(),
  followup_date_1: z.string().optional().nullable(),
  followup_date_2: z.string().optional().nullable(),
  followup_date_3: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
});

type FormData = z.infer<typeof schema>;

type Props = {
  initial?: Lead;
  onSubmit: (payload: FormData) => Promise<void>;
  submitLabel: string;
};

const toDateInput = (value: string | null | undefined) => (value ? value.slice(0, 10) : "");

export function LeadForm({ initial, onSubmit, submitLabel }: Props) {
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
      status: initial?.status ?? "lead_novo",
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
          email: data.email || null,
          site: data.site || null,
          maps_url: data.maps_url || null,
          city: data.city || null,
          phone: data.phone || null,
          whatsapp: data.whatsapp || null,
          decisor_name_role: data.decisor_name_role || null,
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
        <input
          {...register("phone")}
          onChange={(event) => setValue("phone", maskPhone(event.target.value))}
        />
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
        <label className="mb-1 block text-sm font-medium">Decisor (nome/cargo)</label>
        <input {...register("decisor_name_role")} />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Teve resposta</label>
        <select {...register("had_response")}>
          <option value="">-</option>
          <option value="sim">Sim</option>
          <option value="nao">Não</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Nível do lead</label>
        <select {...register("lead_level")}>
          <option value="">-</option>
          <option value="com_interesse">Com interesse</option>
          <option value="sem_interesse">Sem interesse</option>
          <option value="nao_respondeu">Não respondeu</option>
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Status</label>
        <select {...register("status")}>
          <option value="lead_novo">Lead novo</option>
          <option value="em_contato">Em contato</option>
          <option value="reuniao_marcada">Reunião marcada</option>
          <option value="proposta_enviada">Proposta enviada</option>
          <option value="fechado">Fechado</option>
          <option value="perdido">Perdido</option>
        </select>
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
        <label className="mb-1 block text-sm font-medium">Observações</label>
        <textarea rows={4} {...register("notes")} />
      </div>

      <div className="md:col-span-2 flex justify-end">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
