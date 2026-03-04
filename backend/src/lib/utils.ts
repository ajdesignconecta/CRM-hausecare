import { createHash, randomBytes } from "node:crypto";

export const normalizeString = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const normalizeDigits = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
};

export const formatBrazilianPhone = (digits: string | null): string | null => {
  if (!digits) return null;

  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return digits;
};

export const generateResetToken = (): { rawToken: string; tokenHash: string } => {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, tokenHash };
};

export const hashResetToken = (rawToken: string): string => {
  return createHash("sha256").update(rawToken).digest("hex");
};

export const parseCsvDate = (input: string | null | undefined): string | null => {
  const value = normalizeString(input);
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    const [, dd, mm, yyyy] = match;
    return `${yyyy}-${mm}-${dd}`;
  }

  return null;
};

export const toStartOfDayIso = (date: Date): string => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
};
