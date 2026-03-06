"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { AuthHeader } from "@/components/auth/auth-header";

const schema = z.object({
  email: z.string().email("Email invalido"),
  website: z.string().optional(),
  turnstileToken: z.string().optional()
});

type FormData = z.infer<typeof schema>;

export default function MagicLinkPage() {
  const { register, handleSubmit, formState } = useForm<FormData>({
    resolver: zodResolver(schema)
  });

  const onSubmit = async (data: FormData) => {
    try {
      const response = await apiFetch<{ message: string; loginUrl?: string }>("/api/auth/magic-link/request", {
        method: "POST",
        body: JSON.stringify(data)
      });
      toast.success(response.loginUrl ? `Link: ${response.loginUrl}` : response.message);
    } catch (error: any) {
      toast.error(error.message ?? "Erro ao gerar link de acesso");
    }
  };

  return (
    <>
      <AuthHeader
        eyebrow="Acesso rapido"
        title="Entrar com magic link"
        description="Informe seu email para receber um link de login sem senha."
        titleClassName="text-[1.65rem]"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3">
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Email da conta</label>
          <input type="email" {...register("email")} placeholder="voce@empresa.com.br" />
          <p className="mt-1 text-xs text-rose-600">{formState.errors.email?.message}</p>
        </div>
        <input
          type="text"
          {...register("website")}
          tabIndex={-1}
          autoComplete="off"
          className="absolute left-[-9999px] opacity-0"
          aria-hidden
        />
        <Button className="mt-2 w-full rounded-2xl py-3 text-base" type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? "Gerando link..." : "Gerar magic link"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-slate-600">
        Ja tem senha?{" "}
        <Link href="/auth/login" className="font-semibold text-brand-dark hover:underline">
          Voltar ao login
        </Link>
      </p>
    </>
  );
}
