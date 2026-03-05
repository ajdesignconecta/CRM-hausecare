"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageBack } from "@/components/ui/page-back";
import { PasswordInput } from "@/components/ui/password-input";
import { apiFetch } from "@/lib/api";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Senha atual obrigatoria"),
    newPassword: z.string().min(8, "Minimo 8 caracteres"),
    confirmPassword: z.string().min(8, "Confirmacao obrigatoria")
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas nao conferem",
    path: ["confirmPassword"]
  });

type FormData = z.infer<typeof schema>;

export default function ChangePasswordPage() {
  const { register, handleSubmit, reset, formState } = useForm<FormData>({
    resolver: zodResolver(schema)
  });

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-dark/70">Seguranca</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">Alterar senha de acesso</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Mantenha a conta protegida com uma senha forte e exclusiva para o CRM-Hausecare.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card md:p-8">
          <form
            className="space-y-4"
            onSubmit={handleSubmit(async (values) => {
              try {
                await apiFetch("/api/auth/change-password", {
                  method: "PUT",
                  body: JSON.stringify({
                    currentPassword: values.currentPassword,
                    newPassword: values.newPassword
                  })
                });
                reset();
                toast.success("Senha alterada com sucesso");
              } catch (error: any) {
                toast.error(error.message ?? "Erro ao alterar senha");
              }
            })}
          >
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Senha atual</label>
              <PasswordInput {...register("currentPassword")} placeholder="Digite a senha atual" />
              <p className="mt-1 text-xs text-rose-600">{formState.errors.currentPassword?.message}</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Nova senha</label>
              <PasswordInput {...register("newPassword")} placeholder="Nova senha" />
              <p className="mt-1 text-xs text-rose-600">{formState.errors.newPassword?.message}</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Confirmar nova senha</label>
              <PasswordInput {...register("confirmPassword")} placeholder="Repita a nova senha" />
              <p className="mt-1 text-xs text-rose-600">{formState.errors.confirmPassword?.message}</p>
            </div>
            <Button
              className="mt-2 rounded-2xl px-6 py-3 text-base shadow-[0_14px_26px_rgba(0,195,165,0.28)]"
              type="submit"
            >
              Salvar nova senha
            </Button>
          </form>
        </div>

        <aside className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-emerald-50 p-6 shadow-card md:p-8">
          <h2 className="text-lg font-bold text-ink">Boas praticas</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li>Use ao menos 8 caracteres com letras, numeros e simbolos.</li>
            <li>Evite repetir senha de email, banco ou redes sociais.</li>
            <li>Altere a senha periodicamente para reduzir riscos de acesso.</li>
          </ul>
        </aside>
      </div>

      <PageBack />
    </div>
  );
}
