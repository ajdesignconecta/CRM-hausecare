import { cn } from "@/lib/cn";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
};

export function Button({ className, variant = "primary", ...props }: Props) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

  const map = {
    primary: "bg-brand text-white shadow-card hover:bg-emerald-500",
    secondary: "border border-slate-200 bg-white text-ink hover:bg-slate-50",
    danger: "bg-rose-600 text-white hover:bg-rose-500"
  };

  return <button className={cn(base, map[variant], className)} {...props} />;
}
