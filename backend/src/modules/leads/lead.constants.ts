export const LEAD_STATUS = [
  "lead_novo",
  "em_contato",
  "reuniao_marcada",
  "proposta_enviada",
  "fechado",
  "perdido"
] as const;

export const LEAD_LEVEL = ["com_interesse", "sem_interesse", "nao_respondeu"] as const;

export const HAD_RESPONSE = ["sim", "nao"] as const;

export type LeadStatus = (typeof LEAD_STATUS)[number];
export type LeadLevel = (typeof LEAD_LEVEL)[number];
export type HadResponse = (typeof HAD_RESPONSE)[number];
