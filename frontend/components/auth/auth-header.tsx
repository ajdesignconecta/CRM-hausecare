"use client";

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  titleClassName?: string;
};

export function AuthHeader({ eyebrow, title, description, titleClassName }: Props) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-dark/70">{eyebrow}</p>
      <h1 className={`mt-1.5 text-[2rem] font-bold leading-tight text-ink ${titleClassName ?? ""}`}>{title}</h1>
      <p className="mt-1.5 text-sm text-slate-500">{description}</p>
    </div>
  );
}
