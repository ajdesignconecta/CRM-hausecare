export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell relative flex min-h-screen items-center justify-center overflow-hidden bg-[#eef8f4] p-3 md:p-4">
      <div className="pointer-events-none absolute left-[-120px] top-[-120px] h-72 w-72 rounded-full bg-brand/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-140px] right-[-100px] h-80 w-80 rounded-full bg-emerald-300/20 blur-3xl" />

      <div className="grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-[22px] border border-white/70 bg-white/60 shadow-soft backdrop-blur lg:min-h-[600px] lg:grid-cols-[0.9fr_1.1fr]">
        <section className="auth-brand-panel relative hidden flex-col justify-between bg-gradient-to-br from-[#0b4b3f] via-[#0f5f50] to-[#1b7a68] p-6 text-white lg:flex">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.22),_transparent_55%)]" />

          <div className="auth-brand-copy relative z-10 pt-1">
            <img
              src="/logo-auth-white-optimized.png"
              alt="Hausecare"
              className="block h-auto w-[130px] object-contain"
            />
            <h2 className="auth-brand-title mt-8 text-[1.4rem] font-bold leading-tight xl:text-[1.6rem]">
              Operacao comercial previsivel para Home Care
            </h2>
            <p className="mt-3 max-w-sm text-sm text-white/85">
              Centralize funil, tarefas e follow-up com visibilidade executiva em tempo real.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-2 text-xs">
              <p className="rounded-lg border border-white/20 bg-white/10 px-3 py-2">Pipeline com etapas claras de negociacao</p>
              <p className="rounded-lg border border-white/20 bg-white/10 px-3 py-2">Alertas de follow-up para nao perder oportunidades</p>
              <p className="rounded-lg border border-white/20 bg-white/10 px-3 py-2">Historico completo do lead e acoes da equipe</p>
            </div>
          </div>

          <div className="auth-brand-stats relative z-10">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
              <p className="text-xs uppercase tracking-wide text-white/75">Pronto para operar</p>
              <p className="mt-1 text-sm text-white/90">
                Cadastre, organize e acompanhe sua operacao comercial em um unico lugar.
              </p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center p-3 sm:p-4 lg:p-5">
          <div className="auth-form-card w-full max-w-[360px] rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_14px_34px_rgba(10,35,30,0.09)] sm:p-4">
            <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
              <img
                src="/logo-auth-white-optimized.png"
                alt="Hausecare"
                className="block h-auto w-[110px] object-contain"
              />
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                CRM SaaS
              </span>
            </div>
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}
