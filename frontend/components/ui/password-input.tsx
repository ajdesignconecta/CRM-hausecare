"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";

type PasswordInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <div className="relative">
      <input
        id={id}
        {...props}
        type={visible ? "text" : "password"}
        className={cn("pr-11", className)}
      />
      <button
        type="button"
        aria-controls={id}
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      >
        {visible ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3l18 18" />
            <path d="M10.6 10.6a2 2 0 002.8 2.8" />
            <path d="M9.4 5.1A10.3 10.3 0 0112 4c5 0 9 4 10 8a11.8 11.8 0 01-4.2 5.4" />
            <path d="M6.6 6.7A11.8 11.8 0 002 12c1 4 5 8 10 8a10.3 10.3 0 004.3-1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
