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
import { AuthHeader } from "@/components/auth/auth-header";

const schema = z.object({
  email: z.string().email("Email invalido"),
  password: z.string().min(8, "Minimo 8 caracteres"),
  website: z.string().optional(),
  turnstileToken: z.string().optional()
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
      <AuthHeader
        eyebrow="CRM-Hausecare"
        title="Entrar na plataforma"
        description="Acesse funil, tarefas e follow-ups em tempo real."
        titleClassName="text-[1.65rem]"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3">
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
        <input
          type="text"
          {...register("website")}
          tabIndex={-1}
          autoComplete="off"
          className="absolute left-[-9999px] opacity-0"
          aria-hidden
        />

        <Button
          className="mt-2 w-full rounded-2xl py-3 text-base shadow-[0_14px_26px_rgba(0,195,165,0.28)]"
          type="submit"
          disabled={formState.isSubmitting}
        >
          {formState.isSubmitting ? (
            <span className="inline-flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
              Entrando...
            </span>
          ) : (
            "Entrar"
          )}
        </Button>
        <Link
          href="/auth/magic-link"
          className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-brand-dark transition hover:border-brand hover:bg-emerald-50"
        >
          Entrar com magic link
        </Link>
        <p className="inline-flex items-center gap-2 text-xs text-slate-500">
          <span className="h-4 w-4 rounded-full border border-slate-300 text-center leading-[14px]">i</span>
          Sessao segura, criptografia ativa e conformidade LGPD.
        </p>
      </form>

      <div className="mt-4 flex items-center justify-between text-sm">
        <Link href="/auth/register" className="font-medium text-brand-dark hover:underline">
          Criar conta
        </Link>
        <Link href="/auth/forgot-password" className="font-medium text-brand-dark hover:underline">
          Esqueci minha senha
        </Link>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Ao continuar, voce concorda com os{" "}
        <Link href="/termos-de-uso" className="font-semibold text-brand-dark hover:underline">
          Termos de Uso
        </Link>{" "}
        e com a{" "}
        <Link href="/politica-de-privacidade" className="font-semibold text-brand-dark hover:underline">
          Politica de Privacidade
        </Link>
        .
      </p>
    </>
  );
}
