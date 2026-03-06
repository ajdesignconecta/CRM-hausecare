"use client";

type Props = {
  password: string;
};

export function PasswordStrength({ password }: Props) {
  const rules = [
    { label: "Minimo 8 caracteres", ok: password.length >= 8 },
    { label: "1 letra maiuscula", ok: /[A-Z]/.test(password) },
    { label: "1 letra minuscula", ok: /[a-z]/.test(password) },
    { label: "1 numero", ok: /\d/.test(password) }
  ];

  const score = rules.filter((rule) => rule.ok).length;
  const scoreLabel = score <= 1 ? "Fraca" : score <= 3 ? "Media" : "Forte";
  const scoreColor = score <= 1 ? "text-rose-600" : score <= 3 ? "text-amber-600" : "text-emerald-600";

  if (!password) return null;

  return (
    <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className={`text-xs font-semibold ${scoreColor}`}>Forca da senha: {scoreLabel}</p>
      <div className="mt-2 space-y-1">
        {rules.map((rule) => (
          <p key={rule.label} className={`text-xs ${rule.ok ? "text-emerald-700" : "text-slate-500"}`}>
            {rule.ok ? "OK" : "Pendente"} - {rule.label}
          </p>
        ))}
      </div>
    </div>
  );
}
