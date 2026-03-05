import { LeadStatus, statusLabel } from "@/types/lead";

const map: Record<LeadStatus, string> = {
  lead_novo: "border border-slate-300 bg-slate-100 text-slate-800",
  em_contato: "border border-cyan-300 bg-cyan-100 text-cyan-800",
  reuniao_marcada: "border border-indigo-300 bg-indigo-100 text-indigo-800",
  proposta_enviada: "border border-amber-300 bg-amber-100 text-amber-800",
  fechado: "border border-emerald-300 bg-emerald-100 text-emerald-800",
  perdido: "border border-rose-300 bg-rose-100 text-rose-800"
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${map[status]}`}>{statusLabel[status]}</span>;
}
