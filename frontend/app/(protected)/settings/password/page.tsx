"use client";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Senha atual obrigat�ria"),
    newPassword: z.string().min(8, "M�nimo 8 caracteres"),
    confirmPassword: z.string().min(8, "Confirma��o obrigat�ria")
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas n�o conferem",
    path: ["confirmPassword"]
  });

type FormData = z.infer<typeof schema>;

export default function ChangePasswordPage() {
  const { register, handleSubmit, reset, formState } = useForm<FormData>({
    resolver: zodResolver(schema)
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Alterar senha</h1>
      <Card>
        <form
          className="space-y-3"
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
            <label className="mb-1 block text-sm font-medium">Senha atual</label>
            <input type="password" {...register("currentPassword")} />
            <p className="mt-1 text-xs text-rose-600">{formState.errors.currentPassword?.message}</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Nova senha</label>
            <input type="password" {...register("newPassword")} />
            <p className="mt-1 text-xs text-rose-600">{formState.errors.newPassword?.message}</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Confirmar nova senha</label>
            <input type="password" {...register("confirmPassword")} />
            <p className="mt-1 text-xs text-rose-600">{formState.errors.confirmPassword?.message}</p>
          </div>
          <Button type="submit">Salvar nova senha</Button>
        </form>
      </Card>
    </div>
  );
}
