"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";

const schema = z.object({
  email: z.string().email("Email invalido")
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const { register, handleSubmit, formState } = useForm<FormData>({
    resolver: zodResolver(schema)
  });

  const onSubmit = async (data: FormData) => {
    try {
      const response = await apiFetch<{ message: string; resetUrl?: string }>("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify(data)
      });

      toast.success(response.resetUrl ? `Link gerado: ${response.resetUrl}` : response.message);
    } catch (error: any) {
      toast.error(error.message ?? "Erro na solicitacao");
    }
  };

  return (
    <>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-dark/70">Recuperacao</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">Esqueci minha senha</h1>
        <p className="mt-2 text-sm text-slate-500">
          Informe seu email para gerar um link seguro de redefinicao de senha.
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Email da conta</label>
          <input type="email" {...register("email")} placeholder="voce@empresa.com.br" />
          <p className="mt-1 text-xs text-rose-600">{formState.errors.email?.message}</p>
        </div>
        <Button className="mt-2 w-full rounded-2xl py-3 text-base shadow-[0_14px_26px_rgba(0,195,165,0.28)]" type="submit">
          Gerar link de reset
        </Button>
      </form>
      <p className="mt-6 text-sm text-slate-600">
        Lembrou sua senha?{" "}
        <Link href="/auth/login" className="font-semibold text-brand-dark hover:underline">
          Voltar ao login
        </Link>
      </p>
    </>
  );
}
