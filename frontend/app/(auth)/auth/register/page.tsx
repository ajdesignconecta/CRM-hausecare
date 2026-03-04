"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { maskPhone } from "@/lib/format";

const schema = z.object({
  name: z.string().min(2, "Nome completo obrigat�rio"),
  email: z.string().email("Email inv�lido"),
  phone: z
    .string()
    .min(10, "Telefone obrigat�rio")
    .refine((value) => value.replace(/\D/g, "").length >= 10, "Telefone inv�lido"),
  password: z.string().min(8, "M�nimo 8 caracteres")
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
      <h1 className="text-2xl font-bold text-ink">Criar conta</h1>
      <p className="mt-1 text-sm text-slate-500">Inicie sua opera��o comercial</p>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Nome completo</label>
          <input {...register("name")} />
          <p className="mt-1 text-xs text-rose-600">{formState.errors.name?.message}</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <input type="email" {...register("email")} />
          <p className="mt-1 text-xs text-rose-600">{formState.errors.email?.message}</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Telefone</label>
          <input
            {...register("phone")}
            onChange={(event) => setValue("phone", maskPhone(event.target.value), { shouldValidate: true })}
          />
          <p className="mt-1 text-xs text-rose-600">{formState.errors.phone?.message}</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Senha</label>
          <input type="password" {...register("password")} />
          <p className="mt-1 text-xs text-rose-600">{formState.errors.password?.message}</p>
        </div>
        <Button className="w-full" type="submit">
          Criar conta
        </Button>
      </form>
      <p className="mt-4 text-sm">
        J� possui conta?{" "}
        <Link href="/auth/login" className="text-brand-dark underline">
          Entrar
        </Link>
      </p>
    </>
  );
}
