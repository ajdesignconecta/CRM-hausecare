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
import { maskPhone } from "@/lib/format";

const schema = z.object({
  companyName: z.string().min(2, "Nome da empresa obrigatorio"),
  responsibleName: z.string().min(2, "Nome completo do responsavel obrigatorio"),
  email: z.string().email("Email invalido"),
  phone: z
    .string()
    .min(10, "Telefone obrigatorio")
    .refine((value) => value.replace(/\D/g, "").length >= 10, "Telefone invalido"),
  password: z.string().min(8, "Minimo 8 caracteres")
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register, handleSubmit, setValue, formState } = useForm<FormData>({
    resolver: zodResolver(schema)
  });

  const onSubmit = async (data: FormData) => {
    try {
      await apiFetch("/api/auth/register", { method: "POST", body: JSON.stringify(data) });
      toast.success("Conta criada");
      router.replace("/dashboard");
    } catch (error: any) {
      toast.error(error.message ?? "Erro no cadastro");
    }
  };

  return (
    <>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-dark/70">Novo acesso</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">Criar sua conta</h1>
        <p className="mt-2 text-sm text-slate-500">
          Cadastre sua equipe comercial e comece a organizar sua maquina de vendas.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Nome da empresa</label>
          <input {...register("companyName")} placeholder="Nome da sua empresa" />
          <p className="mt-1 text-xs text-rose-600">{formState.errors.companyName?.message}</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Nome completo do responsavel</label>
          <input {...register("responsibleName")} placeholder="Seu nome completo" />
          <p className="mt-1 text-xs text-rose-600">{formState.errors.responsibleName?.message}</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Email</label>
          <input type="email" {...register("email")} placeholder="voce@empresa.com.br" />
          <p className="mt-1 text-xs text-rose-600">{formState.errors.email?.message}</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Telefone</label>
          <input
            {...register("phone")}
            placeholder="(11) 99999-9999"
            onChange={(event) => setValue("phone", maskPhone(event.target.value), { shouldValidate: true })}
          />
          <p className="mt-1 text-xs text-rose-600">{formState.errors.phone?.message}</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">Senha</label>
          <PasswordInput {...register("password")} placeholder="Crie uma senha forte" />
          <p className="mt-1 text-xs text-rose-600">{formState.errors.password?.message}</p>
        </div>
        <Button className="mt-2 w-full rounded-2xl py-3 text-base shadow-[0_14px_26px_rgba(0,195,165,0.28)]" type="submit">
          Criar conta
        </Button>
      </form>

      <p className="mt-6 text-sm text-slate-600">
        Ja possui conta?{" "}
        <Link href="/auth/login" className="font-semibold text-brand-dark hover:underline">
          Entrar
        </Link>
      </p>
    </>
  );
}
