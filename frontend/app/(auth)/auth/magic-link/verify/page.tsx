"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { AuthHeader } from "@/components/auth/auth-header";

export default function MagicLinkVerifyPage() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!token) {
      setFailed(true);
      setLoading(false);
      return;
    }

    apiFetch("/api/auth/magic-link/verify", {
      method: "POST",
      body: JSON.stringify({ token })
    })
      .then(() => {
        toast.success("Login realizado");
        router.replace("/dashboard");
      })
      .catch((error: any) => {
        setFailed(true);
        toast.error(error.message ?? "Link invalido ou expirado");
      })
      .finally(() => setLoading(false));
  }, [router, token]);

  return (
    <div className="space-y-4">
      <AuthHeader
        eyebrow="Verificacao"
        title="Entrando na plataforma"
        description="Estamos validando seu link de acesso seguro."
      />
      {loading ? <p className="text-sm text-slate-500">Validando magic link...</p> : null}
      {failed ? (
        <div className="space-y-3">
          <p className="text-sm text-rose-600">Nao foi possivel validar o link de acesso.</p>
          <Link
            href="/auth/magic-link"
            className="inline-flex w-full items-center justify-center rounded-2xl bg-brand px-4 py-3 text-base font-semibold text-white shadow-card transition hover:bg-emerald-500"
          >
            Gerar novo magic link
          </Link>
        </div>
      ) : null}
    </div>
  );
}
