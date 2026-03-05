"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageBack } from "@/components/ui/page-back";
import { PasswordInput } from "@/components/ui/password-input";
import { apiFetch } from "@/lib/api";
import { maskPhone } from "@/lib/format";

type ProfileResponse = {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  organization_id: string;
  organization_name: string;
};

function sanitizeAvatar(value: string | null | undefined): string | null {
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower.includes("logo-youtube-150x150") || lower.includes("logo-site-menu-2026")) {
    return null;
  }
  return value;
}

function AvatarPreview({ src }: { src: string | null }) {
  if (src) {
    return <img src={src} alt="Foto do usuario" className="h-full w-full object-cover" />;
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-500">
      <svg viewBox="0 0 24 24" className="h-14 w-14" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M20 21a8 8 0 0 0-16 0" />
        <circle cx="12" cy="8" r="4" />
      </svg>
    </div>
  );
}

const normalizeProfile = (value: Partial<ProfileResponse> | null | undefined): ProfileResponse => ({
  id: value?.id ?? "",
  name: value?.name ?? "",
  email: value?.email ?? "",
  phone: value?.phone ?? "",
  avatar_url: sanitizeAvatar(value?.avatar_url),
  organization_id: value?.organization_id ?? "",
  organization_name: value?.organization_name ?? "Organizacao"
});

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Nao foi possivel ler a imagem"));
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(file);
  });

const DENSITY_KEY = "ui_density_mode_v1";
const DATE_FORMAT_KEY = "ui_date_format_v1";

type DensityMode = "comfortable" | "compact";
type DateFormat = "ddmmyyyy" | "yyyymmdd";

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [baseline, setBaseline] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [densityMode, setDensityMode] = useState<DensityMode>("comfortable");
  const [dateFormat, setDateFormat] = useState<DateFormat>("ddmmyyyy");
  const [initialPrefs, setInitialPrefs] = useState<{ densityMode: DensityMode; dateFormat: DateFormat } | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    apiFetch<ProfileResponse>("/api/auth/me")
      .then((value) => {
        const normalized = normalizeProfile(value);
        setProfile(normalized);
        setBaseline(normalized);
      })
      .catch((error) => toast.error(error.message ?? "Erro ao carregar perfil"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let nextDensity: DensityMode = "comfortable";
    let nextDateFormat: DateFormat = "ddmmyyyy";
    try {
      const rawDensity = localStorage.getItem(DENSITY_KEY);
      if (rawDensity === "compact" || rawDensity === "comfortable") {
        nextDensity = rawDensity;
      }

      const rawDateFormat = localStorage.getItem(DATE_FORMAT_KEY);
      if (rawDateFormat === "ddmmyyyy" || rawDateFormat === "yyyymmdd") {
        nextDateFormat = rawDateFormat;
      }
    } catch {
      // no-op
    }
    setDensityMode(nextDensity);
    setDateFormat(nextDateFormat);
    setInitialPrefs({ densityMode: nextDensity, dateFormat: nextDateFormat });
  }, []);

  const hasProfileChanges = useMemo(() => {
    if (!profile || !baseline) return false;
    return (
      profile.name !== baseline.name ||
      profile.phone !== baseline.phone ||
      (profile.avatar_url ?? "") !== (baseline.avatar_url ?? "")
    );
  }, [profile, baseline]);

  const hasPrefChanges = useMemo(() => {
    if (!initialPrefs) return false;
    return initialPrefs.densityMode !== densityMode || initialPrefs.dateFormat !== dateFormat;
  }, [densityMode, dateFormat, initialPrefs]);

  if (loading) {
    return <p className="text-sm text-slate-500" role="status" aria-live="polite">Carregando perfil...</p>;
  }

  if (!profile) {
    return <p className="text-sm text-rose-600">Nao foi possivel carregar o perfil.</p>;
  }

  const submit = async () => {
    try {
      setSaving(true);
      const updated = await apiFetch<ProfileResponse>("/api/auth/me", {
        method: "PUT",
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
          avatar_url: profile.avatar_url || ""
        })
      });
      const merged = normalizeProfile({ ...(profile ?? {}), ...updated });
      setProfile(merged);
      setBaseline(merged);
      window.dispatchEvent(new Event("profile-updated"));
      toast.success("Perfil atualizado com sucesso");
    } catch (error: any) {
      toast.error(error.message ?? "Erro ao atualizar perfil");
    } finally {
      setSaving(false);
    }
  };

  const removeAvatar = async () => {
    try {
      setRemovingAvatar(true);
      const updated = await apiFetch<ProfileResponse>("/api/auth/me", {
        method: "PUT",
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
          avatar_url: ""
        })
      });
      const merged = normalizeProfile({ ...(profile ?? {}), ...updated, avatar_url: null });
      setProfile(merged);
      setBaseline(merged);
      window.dispatchEvent(new Event("profile-updated"));
      toast.success("Foto removida");
    } catch (error: any) {
      toast.error(error.message ?? "Erro ao remover foto");
    } finally {
      setRemovingAvatar(false);
    }
  };

  const savePreferences = async () => {
    try {
      setSavingPrefs(true);
      localStorage.setItem(DENSITY_KEY, densityMode);
      localStorage.setItem(DATE_FORMAT_KEY, dateFormat);
      document.documentElement.setAttribute("data-density", densityMode);
      window.dispatchEvent(new Event("ui-density-mode-changed"));
      setInitialPrefs({ densityMode, dateFormat });
      toast.success("Preferencias salvas");
    } catch {
      toast.error("Nao foi possivel salvar preferencias");
    } finally {
      setSavingPrefs(false);
    }
  };

  const submitPassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error("Preencha os campos de senha");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error("A nova senha precisa ter ao menos 8 caracteres");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("As senhas nao conferem");
      return;
    }

    try {
      setChangingPassword(true);
      await apiFetch("/api/auth/change-password", {
        method: "PUT",
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      toast.success("Senha alterada com sucesso");
    } catch (error: any) {
      toast.error(error.message ?? "Erro ao alterar senha");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-dark/70">Conta</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">Perfil</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Configure seus dados, seguranca e preferencias de uso em um unico lugar.
        </p>
        {hasProfileChanges || hasPrefChanges ? (
          <p className="mt-3 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
            Existem alteracoes pendentes
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="grid grid-cols-1 gap-6 md:grid-cols-[260px_1fr]">
          <div className="space-y-3">
            <div className="mx-auto h-40 w-40 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
              <AvatarPreview src={sanitizeAvatar(profile.avatar_url)} />
            </div>

            <label htmlFor="profile-avatar" className="block text-sm font-medium text-slate-700">Alterar foto</label>
            <input
              id="profile-avatar"
              type="file"
              accept="image/*"
              aria-label="Selecionar foto de perfil"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (file.size > 3 * 1024 * 1024) {
                  toast.error("A imagem deve ter no maximo 3MB");
                  return;
                }
                try {
                  const dataUrl = await fileToDataUrl(file);
                  setProfile((prev) => (prev ? { ...prev, avatar_url: dataUrl } : prev));
                } catch (error: any) {
                  toast.error(error.message ?? "Erro ao preparar imagem");
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={!profile.avatar_url || removingAvatar}
              onClick={removeAvatar}
            >
              {removingAvatar ? "Removendo..." : "Remover foto"}
            </Button>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-ink">Dados pessoais</h2>
            <div>
              <label htmlFor="profile-name" className="text-sm font-medium text-slate-700">Nome</label>
              <input
                id="profile-name"
                aria-label="Nome"
                value={profile.name ?? ""}
                onChange={(e) => setProfile((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
              />
            </div>

            <div>
              <label htmlFor="profile-email" className="text-sm font-medium text-slate-700">Email</label>
              <input id="profile-email" aria-label="Email" value={profile.email ?? ""} disabled />
            </div>

            <div>
              <label htmlFor="profile-phone" className="text-sm font-medium text-slate-700">Telefone</label>
              <input
                id="profile-phone"
                aria-label="Telefone"
                value={profile.phone ?? ""}
                onChange={(e) =>
                  setProfile((prev) => (prev ? { ...prev, phone: maskPhone(e.target.value) } : prev))
                }
              />
            </div>

            <div>
              <label htmlFor="profile-org" className="text-sm font-medium text-slate-700">Organizacao</label>
              <input id="profile-org" aria-label="Organizacao" value={profile.organization_name ?? ""} disabled />
            </div>

            <div className="pt-2">
              <Button onClick={submit} disabled={saving || !hasProfileChanges} aria-label="Salvar perfil" aria-busy={saving}>
                {saving ? "Salvando..." : "Salvar perfil"}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-ink">Seguranca</h2>
            <Link
              href="/settings/password"
              className="text-xs font-semibold text-brand-dark hover:text-brand"
            >
              Abrir pagina de senha
            </Link>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Senha atual</label>
            <PasswordInput
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
              placeholder="Digite sua senha atual"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nova senha</label>
            <PasswordInput
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
              placeholder="Minimo 8 caracteres"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Confirmar nova senha</label>
            <PasswordInput
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              placeholder="Repita a nova senha"
            />
          </div>
          <Button type="button" onClick={submitPassword} disabled={changingPassword}>
            {changingPassword ? "Atualizando..." : "Alterar senha"}
          </Button>
        </Card>

        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-ink">Preferencias</h2>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Densidade da interface</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={densityMode === "comfortable" ? "primary" : "secondary"}
                onClick={() => setDensityMode("comfortable")}
              >
                Confortavel
              </Button>
              <Button
                type="button"
                variant={densityMode === "compact" ? "primary" : "secondary"}
                onClick={() => setDensityMode("compact")}
              >
                Compacto
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Formato de data</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={dateFormat === "ddmmyyyy" ? "primary" : "secondary"}
                onClick={() => setDateFormat("ddmmyyyy")}
              >
                DD/MM/AAAA
              </Button>
              <Button
                type="button"
                variant={dateFormat === "yyyymmdd" ? "primary" : "secondary"}
                onClick={() => setDateFormat("yyyymmdd")}
              >
                AAAA-MM-DD
              </Button>
            </div>
          </div>

          <Button type="button" onClick={savePreferences} disabled={!hasPrefChanges || savingPrefs}>
            {savingPrefs ? "Salvando..." : "Salvar preferencias"}
          </Button>
        </Card>

        <Card className="space-y-4">
          <h2 className="text-lg font-semibold text-ink">Sessao e conta</h2>
          <p className="text-sm text-slate-600">
            Sessao atual ativa neste dispositivo. Em caso de uso compartilhado, finalize sua sessao ao sair.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                await apiFetch("/api/auth/logout", { method: "POST" });
                window.location.href = "/auth/login";
              }}
            >
              Sair desta sessao
            </Button>
            <Link href="/leads" className="inline-flex">
              <Button type="button" variant="secondary">Ir para leads</Button>
            </Link>
          </div>
        </Card>
      </div>

      <PageBack />
    </div>
  );
}
