import { cn } from "@/lib/cn";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("ui-card rounded-xl border border-[#c6d4e1] bg-white p-5 shadow-card", className)}
      {...props}
    />
  );
}
