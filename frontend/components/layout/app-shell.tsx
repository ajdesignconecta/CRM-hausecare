"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

type AlertItem = {
  id: string;
  company: string;
  followup_date: string;
};

type AlertsResponse = {
  upcoming: AlertItem[];
  overdue: AlertItem[];
  badgeCount: number;
};

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/leads/new", label: "Novo lead" },
  { href: "/leads/import", label: "Importar CSV" },
  { href: "/settings/password", label: "Senha" }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [alerts, setAlerts] = useState<AlertsResponse | null>(null);

  useEffect(() => {
    apiFetch<AlertsResponse>("/api/alerts/followups")
      .then(setAlerts)
      .catch(() => setAlerts(null));
  }, [pathname]);

  const hasAlerts = (alerts?.badgeCount ?? 0) > 0;

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-7xl gap-4">
        <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-64 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-card md:block">
          <p className="text-lg font-bold text-brand-dark">CRM-Hausecare</p>
          <p className="mt-1 text-xs text-slate-500">Gestão Home Care</p>
          <nav className="mt-6 space-y-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-brand-soft",
                  pathname.startsWith(link.href) && "bg-brand/10 text-brand-dark"
                )}
              >
                <span>{link.label}</span>
                {link.href === "/dashboard" && hasAlerts ? (
                  <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    {alerts?.badgeCount}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>
          <Button
            className="mt-8 w-full"
            variant="secondary"
            onClick={async () => {
              await apiFetch("/api/auth/logout", { method: "POST" });
              router.replace("/auth/login");
            }}
          >
            Sair
          </Button>
        </aside>

        <main className="flex-1 space-y-4">
          {hasAlerts ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Existem {alerts?.upcoming.length ?? 0} follow-ups a vencer e {alerts?.overdue.length ?? 0} atrasados.
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
