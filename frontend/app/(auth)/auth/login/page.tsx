"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";

const schema = z.object({
  email: z.string().email("Email invalido"),
  password: z.string().min(8, "Minimo 8 caracteres")
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { register, handleSubmit, formState } = useForm<FormData>({
    resolver: zodResolver(schema)
  });

  const onSubmit = async (data: FormData) => {
    try {
      await apiFetch("/api/auth/login", { method: "POST", body: JSON.stringify(data) });
      toast.success("Login realizado");
      router.replace("/dashboard");
    } catch (error: any) {
      toast.error(error.message ?? "Erro no login");
    }
  };

  return (
    <>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-dark/70">CRM-Hausecare</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">Entrar na plataforma</h1>
        <p className="mt-2 text-sm text-slate-500">
          Acesse sua operacao comercial com controle total de leads e follow-up.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Email corporativo</label>
          <input type="email" {...register("email")} placeholder="voce@empresa.com.br" />
          <p className="mt-1 text-xs text-rose-600">{formState.errors.email?.message}</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Senha</label>
          <PasswordInput {...register("password")} placeholder="Digite sua senha" />
          <p className="mt-1 text-xs text-rose-600">{formState.errors.password?.message}</p>
        </div>

        <Button className="mt-2 w-full rounded-2xl py-3 text-base shadow-[0_14px_26px_rgba(0,195,165,0.28)]" type="submit">
          Entrar
        </Button>
      </form>

      <div className="mt-6 flex items-center justify-between text-sm">
        <Link href="/auth/register" className="font-medium text-brand-dark hover:underline">
          Criar conta
        </Link>
        <Link href="/auth/forgot-password" className="font-medium text-brand-dark hover:underline">
          Esqueci minha senha
        </Link>
      </div>
    </>
  );
}
