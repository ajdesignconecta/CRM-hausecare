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
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres")
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
      <h1 className="text-2xl font-bold text-ink">Entrar</h1>
      <p className="mt-1 text-sm text-slate-500">Acesse seu CRM-Hausecare</p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <input type="email" {...register("email")} />
          <p className="mt-1 text-xs text-rose-600">{formState.errors.email?.message}</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Senha</label>
          <input type="password" {...register("password")} />
          <p className="mt-1 text-xs text-rose-600">{formState.errors.password?.message}</p>
        </div>
        <Button className="w-full" type="submit">
          Entrar
        </Button>
      </form>
      <div className="mt-4 flex justify-between text-sm">
        <Link href="/auth/register" className="text-brand-dark underline">
          Criar conta
        </Link>
        <Link href="/auth/forgot-password" className="text-brand-dark underline">
          Esqueci minha senha
        </Link>
      </div>
    </>
  );
}
