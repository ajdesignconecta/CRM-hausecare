import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-dark/70">LGPD</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">Politica de Privacidade</h1>
        <p className="mt-3 text-sm text-slate-600">
          Esta politica descreve como a Hausecare trata dados pessoais no uso do CRM-Hausecare, em conformidade com a Lei Geral de Protecao de Dados (Lei 13.709/2018).
        </p>

        <section className="mt-6 space-y-3 text-sm text-slate-700">
          <h2 className="text-lg font-semibold text-ink">1. Controladora e contato</h2>
          <p>
            Empresa: Hausecare
            <br />
            Email: contato@hausecare.com.br
            <br />
            Telefone: (61) 99206-4157
          </p>
        </section>

        <section className="mt-6 space-y-3 text-sm text-slate-700">
          <h2 className="text-lg font-semibold text-ink">2. Dados coletados</h2>
          <p>
            Coletamos dados de cadastro e uso da plataforma, como nome, email, telefone, empresa, historico de autenticacao e informacoes operacionais de leads inseridas pelos usuarios autorizados.
          </p>
        </section>

        <section className="mt-6 space-y-3 text-sm text-slate-700">
          <h2 className="text-lg font-semibold text-ink">3. Finalidades e bases legais</h2>
          <p>
            Os dados sao tratados para operacao do CRM, autenticacao de usuarios, seguranca da conta, suporte tecnico, cumprimento de obrigacoes legais e melhoria do servico, observando as bases legais aplicaveis da LGPD.
          </p>
        </section>

        <section className="mt-6 space-y-3 text-sm text-slate-700">
          <h2 className="text-lg font-semibold text-ink">4. Compartilhamento e armazenamento</h2>
          <p>
            Os dados podem ser processados por provedores de infraestrutura e banco de dados estritamente para execucao do servico. Adotamos medidas tecnicas e organizacionais para seguranca da informacao.
          </p>
        </section>

        <section className="mt-6 space-y-3 text-sm text-slate-700">
          <h2 className="text-lg font-semibold text-ink">5. Direitos do titular</h2>
          <p>
            O titular pode solicitar confirmacao de tratamento, acesso, correcao, anonimizaçao, portabilidade, revogacao de consentimento e demais direitos previstos na LGPD, pelo email de contato acima.
          </p>
        </section>

        <section className="mt-6 space-y-3 text-sm text-slate-700">
          <h2 className="text-lg font-semibold text-ink">6. Atualizacoes desta politica</h2>
          <p>Esta politica pode ser atualizada para refletir evolucoes legais, tecnicas ou operacionais.</p>
          <p className="text-xs text-slate-500">Ultima atualizacao: 06/03/2026</p>
        </section>

        <div className="mt-8">
          <Link href="/auth/login" className="text-sm font-semibold text-brand-dark hover:underline">
            Voltar ao login
          </Link>
        </div>
      </div>
    </main>
  );
}
