import Link from "next/link";

export default function TermsOfUsePage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-dark/70">Contrato</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">Termos de Uso</h1>
        <p className="mt-3 text-sm text-slate-600">
          Estes Termos de Uso regulam o acesso e a utilizacao do CRM-Hausecare. Ao utilizar a plataforma, o usuario declara ciente e de acordo com as condicoes abaixo.
        </p>

        <section className="mt-6 space-y-3 text-sm text-slate-700">
          <h2 className="text-lg font-semibold text-ink">1. Partes e contato</h2>
          <p>
            Prestadora: Hausecare
            <br />
            Email: contato@hausecare.com.br
            <br />
            Telefone: (61) 99206-4157
          </p>
        </section>

        <section className="mt-6 space-y-3 text-sm text-slate-700">
          <h2 className="text-lg font-semibold text-ink">2. Objeto</h2>
          <p>
            O CRM-Hausecare oferece ferramentas para gestao comercial, acompanhamento de leads, follow-up e operacao de funil para empresas de Home Care.
          </p>
        </section>

        <section className="mt-6 space-y-3 text-sm text-slate-700">
          <h2 className="text-lg font-semibold text-ink">3. Responsabilidades do usuario</h2>
          <p>
            O usuario compromete-se a manter credenciais em sigilo, utilizar dados de forma licita e respeitar a legislacao aplicavel, incluindo a LGPD.
          </p>
        </section>

        <section className="mt-6 space-y-3 text-sm text-slate-700">
          <h2 className="text-lg font-semibold text-ink">4. Disponibilidade e suporte</h2>
          <p>
            A Hausecare envidara esforcos para manter a plataforma disponivel, podendo realizar manutencoes, atualizacoes e melhorias tecnicas periodicas.
          </p>
        </section>

        <section className="mt-6 space-y-3 text-sm text-slate-700">
          <h2 className="text-lg font-semibold text-ink">5. Privacidade e protecao de dados</h2>
          <p>
            O tratamento de dados pessoais segue a Politica de Privacidade e a LGPD. Para exercicio de direitos do titular, utilize os canais de contato oficiais.
          </p>
        </section>

        <section className="mt-6 space-y-3 text-sm text-slate-700">
          <h2 className="text-lg font-semibold text-ink">6. Disposicoes gerais</h2>
          <p>
            Estes termos podem ser atualizados a qualquer momento, com publicacao da versao vigente nesta pagina.
          </p>
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
