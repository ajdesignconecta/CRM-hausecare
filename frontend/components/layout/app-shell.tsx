"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";

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

type CurrentUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  role?: "admin" | "user";
  organization_id: string;
  organization_name: string;
};

type SidebarLink = {
  href: string;
  label: string;
  icon: "dashboard" | "leads" | "import" | "profile" | "password";
  section: "operacao" | "conta";
};

const sanitizeAvatar = (value?: string | null): string | null => {
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower.includes("logo-youtube-150x150") || lower.includes("logo-site-menu-2026")) {
    return null;
  }
  return value;
};

function UserAvatar({
  src,
  alt,
  className
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  if (src) {
    return <img src={src} alt={alt} className={cn("h-full w-full object-cover", className)} />;
  }

  return (
    <div className={cn("flex h-full w-full items-center justify-center bg-slate-100 text-slate-500", className)}>
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M20 21a8 8 0 0 0-16 0" />
        <circle cx="12" cy="8" r="4" />
      </svg>
    </div>
  );
}

const sidebarLinks: SidebarLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard", section: "operacao" },
  { href: "/leads", label: "Leads", icon: "leads", section: "operacao" },
  { href: "/leads/import", label: "Importar", icon: "import", section: "operacao" },
  { href: "/profile", label: "Perfil", icon: "profile", section: "conta" },
  { href: "/settings/password", label: "Senha", icon: "password", section: "conta" }
];

const isActiveLink = (pathname: string, href: string) => {
  if (href === "/leads") {
    return (
      pathname === "/leads" ||
      (pathname.startsWith("/leads/") && pathname !== "/leads/new" && pathname !== "/leads/import")
    );
  }

  return pathname === href;
};

const sectionTitle: Record<SidebarLink["section"], string> = {
  operacao: "Operacao",
  conta: "Conta"
};

function SidebarIcon({ icon }: { icon: SidebarLink["icon"] }) {
  if (icon === "dashboard") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 13h8V3H3v10zm10 8h8V11h-8v10zM3 21h8v-6H3v6zm10-10h8V3h-8v8z" />
      </svg>
    );
  }
  if (icon === "leads") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" />
      </svg>
    );
  }
  if (icon === "import") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3v12m0 0l4-4m-4 4l-4-4M4 17v3h16v-3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (icon === "profile") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1V9a5 5 0 0 0-10 0v2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2z" />
    </svg>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [alerts, setAlerts] = useState<AlertsResponse | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [densityMode, setDensityMode] = useState<"comfortable" | "compact">("comfortable");
  const [sidebarActiveIndex, setSidebarActiveIndex] = useState(0);

  const loadAlerts = useCallback(() => {
    apiFetch<AlertsResponse>("/api/alerts/followups?days=0")
      .then(setAlerts)
      .catch(() => setAlerts(null));
  }, []);

  const loadUser = useCallback(() => {
    apiFetch<CurrentUser>("/api/auth/me")
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    loadAlerts();
    loadUser();
  }, [pathname, loadAlerts, loadUser]);

  useEffect(() => {
    const onProfileUpdated = () => loadUser();
    window.addEventListener("profile-updated", onProfileUpdated);
    return () => window.removeEventListener("profile-updated", onProfileUpdated);
  }, [loadUser]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const firstActive = sidebarLinks.findIndex((link) => isActiveLink(pathname, link.href));
    setSidebarActiveIndex(firstActive >= 0 ? firstActive : 0);
  }, [sidebarOpen, pathname]);

  useEffect(() => {
    if (!sidebarOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [sidebarOpen]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ui_density_mode_v1");
      if (raw === "compact" || raw === "comfortable") {
        setDensityMode(raw);
      }
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    const onDensityChanged = () => {
      try {
        const raw = localStorage.getItem("ui_density_mode_v1");
        if (raw === "compact" || raw === "comfortable") {
          setDensityMode(raw);
        }
      } catch {
        // no-op
      }
    };
    window.addEventListener("ui-density-mode-changed", onDensityChanged);
    return () => window.removeEventListener("ui-density-mode-changed", onDensityChanged);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("ui_density_mode_v1", densityMode);
    } catch {
      // no-op
    }
    document.documentElement.setAttribute("data-density", densityMode);
  }, [densityMode]);

  const hasTodayAlerts = (alerts?.upcoming.length ?? 0) > 0;
  const overdueCount = alerts?.overdue.length ?? 0;
  const followupBadgeCount = alerts?.badgeCount ?? 0;
  const appLogo = "/id-nova-crm.png";
  const sidebarLogo = "/id-nova-branca-CRM.png";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#dceee5_0%,#e9f4ef_36%,#f1f8f4_100%)]">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-[#c6d4e1] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/92">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3 px-4 py-2 md:px-6 md:py-2.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Abrir menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#c6d4e1] bg-white text-slate-700 shadow-sm hover:bg-slate-50"
              onClick={() => setSidebarOpen(true)}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              </svg>
            </button>

            <Link href="/dashboard" className="ml-2 flex shrink-0 items-center md:ml-3">
              <Image
                src={appLogo}
                alt="Hausecare"
                width={170}
                height={28}
                className="h-auto w-[94px] object-contain md:w-[120px]"
              />
            </Link>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 md:text-sm">
            <button
              type="button"
              aria-label="Alternar densidade de visualizacao"
              className="hidden h-9 min-w-[100px] items-center justify-center rounded-md border border-[#c6d4e1] bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 md:inline-flex"
              onClick={() => setDensityMode((prev) => (prev === "comfortable" ? "compact" : "comfortable"))}
            >
              {densityMode === "comfortable" ? "Compacto" : "Confortavel"}
            </button>
            <span className="hidden sm:inline">{user?.name || "Usuario"}</span>
            <div className="h-10 w-10 overflow-hidden rounded-md border border-[#c6d4e1] bg-white shadow-sm">
              <UserAvatar src={sanitizeAvatar(user?.avatar_url)} alt="Perfil" />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1600px] space-y-4 px-4 pb-4 pt-16 md:px-6 md:pb-6 md:pt-20">
        {hasTodayAlerts ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
            Hoje voce tem {alerts?.upcoming.length ?? 0} follow-up(s) para retornar.
          </div>
        ) : null}

        <main className="min-w-0">{children}</main>
      </div>

      {sidebarOpen ? (
        <>
          <button
            type="button"
            aria-label="Fechar menu"
            className="fixed inset-0 z-40 bg-slate-900/45"
            onClick={() => setSidebarOpen(false)}
          />

          <aside className="fixed left-0 top-0 z-50 flex h-screen w-[300px] max-w-[85vw] flex-col border-r border-slate-700/60 bg-[#121728] text-white shadow-[10px_0_40px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
              <Link href="/dashboard" className="flex items-center" onClick={() => setSidebarOpen(false)}>
                <Image
                  src={sidebarLogo}
                  alt="Hausecare"
                  width={170}
                  height={28}
                  className="h-auto w-[112px] object-contain"
                />
              </Link>
              <button
                type="button"
                aria-label="Fechar menu"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/20 text-white/85 hover:bg-white/10"
                onClick={() => setSidebarOpen(false)}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="border-b border-white/10 px-4 py-4">
              <div className="flex items-center gap-3 rounded-lg border border-white/15 bg-white/5 p-3">
                <div className="h-11 w-11 overflow-hidden rounded-md border border-white/30">
                  <UserAvatar
                    src={sanitizeAvatar(user?.avatar_url)}
                    alt="Avatar"
                    className="bg-gradient-to-br from-[#0d2f4f] to-[#2cae95] text-white"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{user?.name || "Usuario"}</p>
                  <p className="truncate text-xs text-white/70">{user?.email || "Sem email"}</p>
                  <p className="truncate text-[11px] text-white/50">
                    {user?.organization_name || "Organizacao"} {user?.role ? `• ${user.role}` : ""}
                  </p>
                </div>
              </div>
              <Link
                href="/profile"
                onClick={() => setSidebarOpen(false)}
                className="mt-3 inline-flex rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold text-white/90 hover:bg-white/10"
              >
                Ver perfil
              </Link>
            </div>

            <div className="border-b border-white/10 p-3">
              <Link
                href="/leads/new"
                onClick={() => setSidebarOpen(false)}
                className="block rounded-md bg-emerald-500 px-3 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-emerald-400"
              >
                + Novo lead
              </Link>
            </div>

            <nav
              className="flex-1 space-y-4 overflow-y-auto px-3 py-4"
              onKeyDown={(event) => {
                const menuItems = Array.from(
                  document.querySelectorAll<HTMLAnchorElement>("[data-sidebar-menu-item='true']")
                );
                if (!menuItems.length) return;
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  const next = (sidebarActiveIndex + 1) % menuItems.length;
                  setSidebarActiveIndex(next);
                  menuItems[next]?.focus();
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  const prev = (sidebarActiveIndex - 1 + menuItems.length) % menuItems.length;
                  setSidebarActiveIndex(prev);
                  menuItems[prev]?.focus();
                }
                if (event.key === "Enter") {
                  const current = menuItems[sidebarActiveIndex];
                  if (current && document.activeElement === current) {
                    event.preventDefault();
                    current.click();
                  }
                }
              }}
            >
              {(["operacao", "conta"] as const).map((sectionKey) => (
                <div key={sectionKey} className="space-y-1.5">
                  <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">
                    {sectionTitle[sectionKey]}
                  </p>
                  {sidebarLinks
                    .filter((link) => link.section === sectionKey)
                    .map((link) => {
                      const isActive = isActiveLink(pathname, link.href);
                      const badge =
                        link.href === "/dashboard"
                          ? followupBadgeCount
                          : link.href === "/leads"
                            ? overdueCount
                            : 0;
                      const index = sidebarLinks.findIndex((item) => item.href === link.href);

                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          data-sidebar-menu-item="true"
                          aria-current={isActive ? "page" : undefined}
                          onClick={() => setSidebarOpen(false)}
                          onFocus={() => setSidebarActiveIndex(index)}
                          className={cn(
                            "flex items-center gap-2.5 rounded-md border-l-2 px-3 py-2.5 text-sm font-medium transition",
                            "border-l-transparent text-white/85 hover:bg-white/10 hover:text-white",
                            isActive && "border-l-emerald-300 bg-[#1f2a44] text-white"
                          )}
                        >
                          <SidebarIcon icon={link.icon} />
                          <span className="flex-1">{link.label}</span>
                          {badge > 0 ? (
                            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[11px] font-bold text-white">
                              {badge > 99 ? "99+" : badge}
                            </span>
                          ) : null}
                        </Link>
                      );
                    })}
                </div>
              ))}
            </nav>

            <div className="border-t border-white/10 p-3">
              <a
                href="https://wa.me/5561992064157"
                target="_blank"
                rel="noreferrer"
                className="mb-2 block rounded-md border border-white/20 px-3 py-2.5 text-sm font-medium text-white/85 transition hover:bg-white/10 hover:text-white"
                onClick={() => setSidebarOpen(false)}
              >
                Suporte
              </a>
              <button
                type="button"
                className="block w-full rounded-md bg-white/10 px-3 py-2.5 text-left text-sm font-medium text-white transition hover:bg-white/20"
                onClick={async () => {
                  try {
                    await apiFetch("/api/auth/logout", { method: "POST" });
                  } catch {
                    // Even if logout API fails, continue to login to avoid client crash loop.
                  }
                  setSidebarOpen(false);
                  window.location.replace("/auth/login");
                }}
              >
                Sair
              </button>
              <p className="mt-2 px-1 text-[10px] uppercase tracking-[0.12em] text-white/40">Versao 2026.03</p>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}
