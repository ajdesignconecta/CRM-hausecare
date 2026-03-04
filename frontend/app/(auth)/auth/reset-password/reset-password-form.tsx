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
  password: z.string().min(8, "M�nimo 8 caracteres")
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
      <h1 className="text-2xl font-bold text-ink">Redefinir senha</h1>
      <p className="mt-1 text-sm text-slate-500">Insira sua nova senha</p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Nova senha</label>
          <input type="password" {...register("password")} />
          <p className="mt-1 text-xs text-rose-600">{formState.errors.password?.message}</p>
        </div>
        <Button className="w-full" type="submit" disabled={!token}>
          Atualizar senha
        </Button>
      </form>
      <p className="mt-4 text-sm">
        <Link href="/auth/login" className="text-brand-dark underline">
          Voltar ao login
        </Link>
      </p>
    </>
  );
}
