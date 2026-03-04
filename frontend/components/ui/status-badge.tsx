import { LeadStatus, statusLabel } from "@/types/lead";

const map: Record<LeadStatus, string> = {
  lead_novo: "bg-slate-100 text-slate-700",
  em_contato: "bg-cyan-100 text-cyan-700",
  reuniao_marcada: "bg-indigo-100 text-indigo-700",
  proposta_enviada: "bg-amber-100 text-amber-700",
  fechado: "bg-emerald-100 text-emerald-700",
  perdido: "bg-rose-100 text-rose-700"
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${map[status]}`}>{statusLabel[status]}</span>;
}
