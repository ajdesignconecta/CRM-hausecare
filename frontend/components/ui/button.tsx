import { cn } from "@/lib/cn";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
};

export function Button({ className, variant = "primary", ...props }: Props) {
  const base =
    "ui-btn inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/45 disabled:cursor-not-allowed disabled:opacity-50";

  const map = {
    primary: "bg-brand text-white shadow-card hover:bg-emerald-500",
    secondary: "border border-[#c6d4e1] bg-white text-ink shadow-sm hover:bg-slate-50",
    danger: "bg-rose-600 text-white shadow-sm hover:bg-rose-500"
  };

  return <button className={cn(base, map[variant], className)} {...props} />;
}
