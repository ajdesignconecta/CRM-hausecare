export const maskPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
};

const parseDateValue = (value: string): Date | null => {
  if (!value) return null;

  // Already has time/zone information.
  if (value.includes("T")) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  // Date-only field from DB (YYYY-MM-DD)
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatDateBr = (date: string | null) => {
  if (!date) return "-";
  const parsed = parseDateValue(date);
  if (!parsed) return "-";
  return parsed.toLocaleDateString("pt-BR");
};

export const formatDateTimeBr = (date: string | null) => {
  if (!date) return "-";
  const parsed = parseDateValue(date);
  if (!parsed) return "-";
  return parsed.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};
