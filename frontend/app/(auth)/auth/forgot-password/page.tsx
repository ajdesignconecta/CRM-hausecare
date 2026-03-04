"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";

const schema = z.object({
  email: z.string().email("Email inválido")
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
      toast.error(error.message ?? "Erro na solicitação");
    }
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-ink">Esqueci minha senha</h1>
      <p className="mt-1 text-sm text-slate-500">Solicite um token de redefinição</p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <input type="email" {...register("email")} />
          <p className="mt-1 text-xs text-rose-600">{formState.errors.email?.message}</p>
        </div>
        <Button className="w-full" type="submit">
          Gerar token de reset
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
