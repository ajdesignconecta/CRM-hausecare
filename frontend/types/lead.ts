export type LeadStatus =
  | "lead_novo"
  | "em_contato"
  | "reuniao_marcada"
  | "proposta_enviada"
  | "fechado"
  | "perdido";

export type LeadLevel = "com_interesse" | "sem_interesse" | "nao_respondeu";
export type HadResponse = "sim" | "nao";

export type Lead = {
  id: string;
  lead_number: number;
  company: string;
  city: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  site: string | null;
  maps_url: string | null;
  decisor_name_role: string | null;
  had_response: HadResponse | null;
  lead_level: LeadLevel | null;
  status: LeadStatus;
  first_contact_date: string | null;
  followup_date_1: string | null;
  followup_date_2: string | null;
  followup_date_3: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ListResponse<T> = {
  items: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
  };
};

export const statusLabel: Record<LeadStatus, string> = {
  lead_novo: "Lead novo",
  em_contato: "Em contato",
  reuniao_marcada: "Reunião marcada",
  proposta_enviada: "Proposta enviada",
  fechado: "Fechado",
  perdido: "Perdido"
};

export const levelLabel: Record<LeadLevel, string> = {
  com_interesse: "Com interesse",
  sem_interesse: "Sem interesse",
  nao_respondeu: "Não respondeu"
};

export const responseLabel: Record<HadResponse, string> = {
  sim: "Sim",
  nao: "Não"
};
