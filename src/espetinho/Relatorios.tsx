import { useState } from 'react'
import { NOMES_FORMA, brl, data, dataHora, pct, resumirCaixa, type Dados, type Resumo } from './dados'
import { imprimirRelatorio } from './impressao'
import type { Caixa } from './tipos'
import { Cartao, btn } from './ui'

function Linha({ rotulo, valor, forte, neg }: { rotulo: string; valor: string; forte?: boolean; neg?: boolean }) {
  return (
    <div className={`flex justify-between py-1 ${forte ? 'border-t-2 border-stone-300 pt-2 text-lg font-extrabold' : ''}`}>
      <span className={neg ? 'text-stone-600' : ''}>{rotulo}</span>
      <span className={neg ? 'text-red-700' : ''}>{valor}</span>
    </div>
  )
}

export function RelatorioCaixa({ caixa, r, dados }: { caixa: Caixa; r: Resumo; dados: Dados }) {
  const diferenca = caixa.dinheiroContado !== undefined ? caixa.dinheiroContado - r.dinheiroEsperado : undefined
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-extrabold">Caixa Nº {caixa.numero}</h2>
          <p className="text-sm text-stone-600">
            {dataHora(caixa.abertoEm)} até {caixa.fechadoEm ? dataHora(caixa.fechadoEm) : 'agora (aberto)'}
          </p>
        </div>
        <button className={btn.secundario} onClick={() => imprimirRelatorio(caixa, r, dados.config)}>
          🖨️ Imprimir relatório
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cartao titulo="Faturamento" valor={brl(r.faturamento)} detalhe={`${r.qtdPedidos} pedidos`} cor="azul" />
        <Cartao titulo="💵 Em dinheiro" valor={brl(r.dinheiroEsperado)} detalhe="esperado na gaveta" />
        <Cartao titulo="🏦 Em conta" valor={brl(r.emConta)} detalhe="Pix + cartão, sem taxas" />
        <Cartao titulo="Lucro" valor={brl(r.lucroLiquido)} detalhe={`margem ${pct(r.margem)}`} cor={r.lucroLiquido >= 0 ? 'verde' : 'vermelho'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border-2 border-stone-200 bg-white p-4">
          <h3 className="mb-2 font-extrabold">Lucro</h3>
          <Linha rotulo="Faturamento" valor={brl(r.faturamento)} />
          <Linha rotulo="− Custo dos produtos (insumos)" valor={brl(r.cmv)} neg />
          <Linha rotulo="− Taxas da maquininha" valor={brl(r.taxas)} neg />
          <Linha rotulo="− Despesas do dia" valor={brl(r.despesas)} neg />
          <Linha rotulo="= Lucro" valor={brl(r.lucroLiquido)} forte />
          {r.descontos > 0 && <p className="mt-2 text-sm text-stone-500">Descontos dados: {brl(r.descontos)}</p>}
        </section>

        <section className="rounded-2xl border-2 border-stone-200 bg-white p-4">
          <h3 className="mb-2 font-extrabold">Dinheiro na gaveta</h3>
          <Linha rotulo="Troco inicial" valor={brl(r.trocoInicial)} />
          <Linha rotulo="+ Vendas em dinheiro" valor={brl(r.porForma.dinheiro)} />
          {r.suprimentos > 0 && <Linha rotulo="+ Suprimentos" valor={brl(r.suprimentos)} />}
          {r.sangrias > 0 && <Linha rotulo="− Retiradas (sangria)" valor={brl(r.sangrias)} neg />}
          {r.despesasDinheiro > 0 && <Linha rotulo="− Despesas pagas em dinheiro" valor={brl(r.despesasDinheiro)} neg />}
          <Linha rotulo="= Esperado" valor={brl(r.dinheiroEsperado)} forte />
          {caixa.dinheiroContado !== undefined && (
            <>
              <Linha rotulo="Contado no fechamento" valor={brl(caixa.dinheiroContado)} />
              <div
                className={`mt-2 rounded-lg p-2 text-center font-bold ${Math.abs(diferenca!) < 0.01 ? 'bg-emerald-100 text-emerald-800' : diferenca! > 0 ? 'bg-sky-100 text-sky-800' : 'bg-red-100 text-red-800'}`}
              >
                {Math.abs(diferenca!) < 0.01 ? 'Caixa bateu certinho ✔' : diferenca! > 0 ? `Sobrou ${brl(diferenca!)}` : `Faltou ${brl(-diferenca!)}`}
              </div>
            </>
          )}
        </section>

        <section className="rounded-2xl border-2 border-stone-200 bg-white p-4">
          <h3 className="mb-2 font-extrabold">Em conta</h3>
          <Linha rotulo="Pix" valor={brl(r.porForma.pix)} />
          <Linha rotulo="Débito" valor={brl(r.porForma.debito)} />
          <Linha rotulo="Crédito" valor={brl(r.porForma.credito)} />
          <Linha rotulo="− Taxas da maquininha" valor={brl(r.taxas)} neg />
          {r.despesasConta > 0 && <Linha rotulo="− Despesas pagas da conta" valor={brl(r.despesasConta)} neg />}
          <Linha rotulo="= Em conta" valor={brl(r.emConta)} forte />
        </section>
      </div>

      <section className="overflow-x-auto rounded-2xl border-2 border-stone-200 bg-white p-4">
        <h3 className="mb-2 font-extrabold">Produtos</h3>
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b-2 border-stone-200 text-left text-stone-600">
              <th className="py-1">Produto</th>
              <th className="py-1 text-right">Preparado</th>
              <th className="py-1 text-right">Vendido</th>
              <th className="py-1 text-right">Sobrou</th>
              <th className="py-1 text-right">Receita</th>
              <th className="py-1 text-right">Custo</th>
              <th className="py-1 text-right">Lucro bruto</th>
            </tr>
          </thead>
          <tbody>
            {r.porProduto.map((l) => (
              <tr key={l.produtoId} className="border-b border-stone-100">
                <td className="py-1.5">
                  {l.emoji} {l.nome}
                </td>
                <td className="text-right">{l.estoque ?? '—'}</td>
                <td className="text-right font-bold">{l.vendidos}</td>
                <td className={`text-right ${l.restante && l.restante > 0 ? 'font-bold text-amber-700' : ''}`}>{l.restante ?? '—'}</td>
                <td className="text-right">{brl(l.receita)}</td>
                <td className="text-right">{brl(l.custo)}</td>
                <td className="text-right font-semibold">{brl(l.receita - l.custo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-stone-500">“Sobrou” = preparado − vendido. Use para planejar o próximo dia e controlar perdas.</p>
      </section>

      {caixa.movimentos.length > 0 && (
        <section className="rounded-2xl border-2 border-stone-200 bg-white p-4">
          <h3 className="mb-2 font-extrabold">Despesas e movimentações</h3>
          <ul className="divide-y divide-stone-100 text-sm">
            {caixa.movimentos.map((m) => (
              <li key={m.id} className="flex justify-between py-1.5">
                <span>
                  <b className="capitalize">{m.tipo}</b> · {m.descricao} <span className="text-stone-500">({m.origem === 'dinheiro' ? 'gaveta' : 'conta'})</span>
                </span>
                <b>{brl(m.valor)}</b>
              </li>
            ))}
          </ul>
        </section>
      )}

      {r.cancelados.length > 0 && (
        <p className="text-sm text-stone-500">
          {r.cancelados.length} pedido(s) cancelado(s), somando {brl(r.cancelados.reduce((s, p) => s + p.total, 0))} — fora do faturamento.
        </p>
      )}
      {caixa.observacao && <p className="text-sm text-stone-600">Obs.: {caixa.observacao}</p>}
    </div>
  )
}

export default function Relatorios({ dados }: { dados: Dados }) {
  const { caixas, pedidos, produtos } = dados
  const ordenados = caixas.slice().sort((a, b) => b.abertoEm.localeCompare(a.abertoEm))
  const [selId, setSelId] = useState<string | null>(ordenados[0]?.id ?? null)
  const hoje = new Date()
  const [mes, setMes] = useState(`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`)

  const sel = caixas.find((c) => c.id === selId)
  const resumos = ordenados.map((c) => ({ c, r: resumirCaixa(c, pedidos, produtos) }))
  const doMes = resumos.filter(({ c }) => c.abertoEm.slice(0, 7) === mes)
  const soma = (f: (r: Resumo) => number) => doMes.reduce((s, x) => s + f(x.r), 0)

  if (!caixas.length) return <p className="mt-16 text-center text-stone-600">Ainda não há caixas. Os relatórios aparecem depois de abrir e fechar o primeiro caixa.</p>

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border-2 border-stone-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-extrabold">Resumo do mês</h2>
          <input type="month" className="rounded-lg border-2 border-stone-200 px-2 py-1" value={mes} onChange={(e) => setMes(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Cartao titulo="Dias de caixa" valor={doMes.length} />
          <Cartao titulo="Faturamento" valor={brl(soma((r) => r.faturamento))} cor="azul" />
          <Cartao titulo="Espetos vendidos" valor={soma((r) => r.espetosVendidos)} cor="laranja" />
          <Cartao titulo="Custos + despesas" valor={brl(soma((r) => r.cmv + r.taxas + r.despesas))} />
          <Cartao titulo="Lucro" valor={brl(soma((r) => r.lucroLiquido))} cor={soma((r) => r.lucroLiquido) >= 0 ? 'verde' : 'vermelho'} />
        </div>
      </section>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <aside className="shrink-0 rounded-2xl border-2 border-stone-200 bg-white p-2 lg:w-72">
          <ul className="max-h-[70vh] overflow-y-auto">
            {resumos.map(({ c, r }) => (
              <li key={c.id}>
                <button
                  onClick={() => setSelId(c.id)}
                  className={`w-full rounded-xl px-3 py-2 text-left ${selId === c.id ? 'bg-orange-100' : 'hover:bg-stone-50'}`}
                >
                  <div className="flex justify-between font-bold">
                    <span>
                      Nº {c.numero} · {data(c.abertoEm)}
                    </span>
                    {!c.fechadoEm && <span className="text-xs text-emerald-700">ABERTO</span>}
                  </div>
                  <div className="text-sm text-stone-600">
                    {brl(r.faturamento)} · lucro {brl(r.lucroLiquido)}
                  </div>
                  <div className="text-xs text-stone-500">
                    {(Object.keys(r.porForma) as (keyof typeof r.porForma)[])
                      .filter((f) => r.porForma[f] > 0)
                      .map((f) => `${NOMES_FORMA[f]} ${brl(r.porForma[f])}`)
                      .join(' · ')}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <div className="min-w-0 flex-1">{sel && <RelatorioCaixa caixa={sel} r={resumirCaixa(sel, pedidos, produtos)} dados={dados} />}</div>
      </div>
    </div>
  )
}
