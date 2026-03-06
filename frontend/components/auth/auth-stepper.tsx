"use client";

import { cn } from "@/lib/cn";

type Step = {
  label: string;
};

type Props = {
  steps: Step[];
  current: number;
};

export function AuthStepper({ steps, current }: Props) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {steps.map((step, index) => {
        const active = index === current;
        const done = index < current;
        return (
          <div key={step.label} className="flex min-w-0 flex-1 items-center gap-2">
            <div
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                done && "border-emerald-500 bg-emerald-500 text-white",
                active && "border-brand bg-brand text-white",
                !active && !done && "border-slate-300 bg-white text-slate-500"
              )}
            >
              {index + 1}
            </div>
            <p className={cn("truncate text-xs font-medium", active ? "text-ink" : "text-slate-500")}>{step.label}</p>
          </div>
        );
      })}
    </div>
  );
}
