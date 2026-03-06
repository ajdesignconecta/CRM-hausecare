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
import { PasswordStrength } from "@/components/ui/password-strength";
import { AuthHeader } from "@/components/auth/auth-header";

const schema = z
  .object({
    password: z.string().min(8, "Minimo 8 caracteres"),
    confirmPassword: z.string().min(8, "Confirme sua senha")
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas nao conferem",
    path: ["confirmPassword"]
  });

type FormData = z.infer<typeof schema>;

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();

  const { register, handleSubmit, watch, formState } = useForm<FormData>({
    resolver: zodResolver(schema)
  });
  const password = watch("password") ?? "";

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
      <AuthHeader
        eyebrow="Nova senha"
        title="Redefinir acesso"
        description="Defina uma nova senha para voltar ao CRM-Hausecare com seguranca."
      />
      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3">
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Nova senha</label>
          <PasswordInput {...register("password")} placeholder="Digite sua nova senha" />
          <p className="mt-1 text-xs text-rose-600">{formState.errors.password?.message}</p>
          <PasswordStrength password={password} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Confirmar nova senha</label>
          <PasswordInput {...register("confirmPassword")} placeholder="Repita a nova senha" />
          <p className="mt-1 text-xs text-rose-600">{formState.errors.confirmPassword?.message}</p>
        </div>
        <Button
          className="mt-2 w-full rounded-2xl py-3 text-base shadow-[0_14px_26px_rgba(0,195,165,0.28)]"
          type="submit"
          disabled={!token || formState.isSubmitting}
        >
          {formState.isSubmitting ? "Atualizando..." : "Atualizar senha"}
        </Button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        <Link href="/auth/login" className="font-semibold text-brand-dark hover:underline">
          Voltar ao login
        </Link>
      </p>
    </>
  );
}
