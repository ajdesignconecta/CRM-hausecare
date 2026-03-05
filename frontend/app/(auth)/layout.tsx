export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-shell relative h-screen overflow-hidden bg-[#eef8f4] p-3 md:p-4">
      <div className="pointer-events-none absolute left-[-120px] top-[-120px] h-72 w-72 rounded-full bg-brand/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-140px] right-[-100px] h-80 w-80 rounded-full bg-emerald-300/20 blur-3xl" />

      <div className="mx-auto grid h-full w-full max-w-6xl grid-cols-1 overflow-hidden rounded-[28px] border border-white/70 bg-white/60 shadow-soft backdrop-blur md:grid-cols-2">
        <section className="auth-brand-panel relative hidden flex-col justify-between bg-gradient-to-br from-[#0b4b3f] via-[#0f5f50] to-[#1b7a68] p-10 text-white md:flex">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.22),_transparent_55%)]" />

          <div className="auth-brand-copy relative z-10">
            <img
              src="/logo-auth-white-optimized.png"
              alt="Hausecare"
              className="block h-auto w-[130px] object-contain"
            />
            <h2 className="auth-brand-title mt-10 text-4xl font-bold leading-tight">
              CRM de performance com padrao global para Home Care
            </h2>
            <p className="mt-4 max-w-md text-sm text-white/85">
              Estrategia, processo e previsibilidade em um unico fluxo. Inspirado nas melhores
              praticas de CRMs do Brasil e do mundo para elevar conversao, velocidade comercial e
              controle de ponta a ponta.
            </p>
          </div>

          <div className="auth-brand-stats relative z-10 grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-3">
              <p className="text-xs text-white/75">Leads</p>
              <p className="text-xl font-bold">+1000</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-3">
              <p className="text-xs text-white/75">Follow-up</p>
              <p className="text-xl font-bold">7d</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-3">
              <p className="text-xs text-white/75">Pipeline</p>
              <p className="text-xl font-bold">360deg</p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center p-5 sm:p-8 md:p-10">
          <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_24px_60px_rgba(10,35,30,0.12)] sm:p-8">
            <div className="mb-6 flex items-center gap-3 md:hidden">
              <img
                src="/logo-auth-white-optimized.png"
                alt="Hausecare"
                className="block h-auto w-[110px] object-contain"
              />
            </div>
            {children}
          </div>
        </section>
      </div>
    </div>
  );
}
