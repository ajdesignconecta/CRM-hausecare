"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrength } from "@/components/ui/password-strength";
import { AuthHeader } from "@/components/auth/auth-header";
import { AuthStepper } from "@/components/auth/auth-stepper";
import { maskPhone } from "@/lib/format";

const schema = z
  .object({
    companyName: z.string().min(2, "Nome da empresa obrigatorio"),
    responsibleName: z.string().min(2, "Nome completo do responsavel obrigatorio"),
    email: z.string().email("Email invalido"),
    phone: z
      .string()
      .min(10, "Telefone obrigatorio")
      .refine((value) => value.replace(/\D/g, "").length >= 10, "Telefone invalido"),
    password: z.string().min(8, "Minimo 8 caracteres"),
    confirmPassword: z.string().min(8, "Confirme sua senha"),
    website: z.string().optional(),
    turnstileToken: z.string().optional()
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas nao conferem",
    path: ["confirmPassword"]
  });

type FormData = z.infer<typeof schema>;

const steps = [{ label: "Dados da operacao" }, { label: "Seguranca da conta" }];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const { register, handleSubmit, setValue, trigger, watch, formState } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onTouched"
  });

  const password = watch("password") ?? "";
  const canAdvance = useMemo(
    () =>
      Boolean(
        watch("companyName")?.trim() &&
          watch("responsibleName")?.trim() &&
          watch("email")?.trim() &&
          watch("phone")?.trim()
      ),
    [watch("companyName"), watch("responsibleName"), watch("email"), watch("phone")]
  );

  const onSubmit = async (data: FormData) => {
    try {
      await apiFetch("/api/auth/register", { method: "POST", body: JSON.stringify(data) });
      toast.success("Conta criada");
      router.replace("/onboarding");
    } catch (error: any) {
      toast.error(error.message ?? "Erro no cadastro");
    }
  };

  return (
    <>
      <AuthHeader
        eyebrow="Novo acesso"
        title="Criar conta profissional"
        description="Configure sua operacao comercial em dois passos e inicie seu CRM com padrao SaaS."
        titleClassName="text-[1.65rem]"
      />
      <AuthStepper steps={steps} current={step} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {step === 0 ? (
          <>
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
              <label className="mb-1 block text-sm font-semibold text-slate-700">Email corporativo</label>
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
            <Button
              type="button"
              className="w-full rounded-2xl py-3 text-base"
              onClick={async () => {
                const valid = await trigger(["companyName", "responsibleName", "email", "phone"]);
                if (valid) setStep(1);
              }}
              disabled={!canAdvance}
            >
              Continuar
            </Button>
          </>
        ) : (
          <>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Senha</label>
              <PasswordInput {...register("password")} placeholder="Crie uma senha forte" />
              <p className="mt-1 text-xs text-rose-600">{formState.errors.password?.message}</p>
              <PasswordStrength password={password} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Confirmar senha</label>
              <PasswordInput {...register("confirmPassword")} placeholder="Repita a senha" />
              <p className="mt-1 text-xs text-rose-600">{formState.errors.confirmPassword?.message}</p>
            </div>
            <input
              type="text"
              {...register("website")}
              tabIndex={-1}
              autoComplete="off"
              className="absolute left-[-9999px] opacity-0"
              aria-hidden
            />
            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                className="w-1/3 rounded-2xl py-3 text-base"
                onClick={() => setStep(0)}
              >
                Voltar
              </Button>
              <Button
                className="w-2/3 rounded-2xl py-3 text-base shadow-[0_14px_26px_rgba(0,195,165,0.28)]"
                type="submit"
                disabled={formState.isSubmitting}
              >
                {formState.isSubmitting ? "Criando conta..." : "Criar conta"}
              </Button>
            </div>
          </>
        )}
      </form>

      <p className="mt-4 text-sm text-slate-600">
        Ja possui conta?{" "}
        <Link href="/auth/login" className="font-semibold text-brand-dark hover:underline">
          Entrar
        </Link>
      </p>
    </>
  );
}
