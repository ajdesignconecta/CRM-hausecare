"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";

const schema = z.object({
  password: z.string().min(8, "Minimo 8 caracteres")
});

type FormData = z.infer<typeof schema>;

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();

  const { register, handleSubmit, formState } = useForm<FormData>({
    resolver: zodResolver(schema)
  });

  const onSubmit = async (data: FormData) => {
    try {
      await apiFetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password: data.password })
      });
      toast.success("Senha redefinida");
      router.replace("/auth/login");
    } catch (error: any) {
      toast.error(error.message ?? "Erro ao redefinir senha");
    }
  };

  return (
    <>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-dark/70">Nova senha</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">Redefinir acesso</h1>
        <p className="mt-2 text-sm text-slate-500">Defina uma nova senha para voltar ao CRM-Hausecare.</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Nova senha</label>
          <input type="password" {...register("password")} placeholder="Digite sua nova senha" />
          <p className="mt-1 text-xs text-rose-600">{formState.errors.password?.message}</p>
        </div>
        <Button
          className="mt-2 w-full rounded-2xl py-3 text-base shadow-[0_14px_26px_rgba(0,195,165,0.28)]"
          type="submit"
          disabled={!token}
        >
          Atualizar senha
        </Button>
      </form>
      <p className="mt-6 text-sm text-slate-600">
        <Link href="/auth/login" className="font-semibold text-brand-dark hover:underline">
          Voltar ao login
        </Link>
      </p>
    </>
  );
}
