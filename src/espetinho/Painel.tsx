import { useState } from 'react'
import { NOMES_FORMA, brl, hora, pct, resumirCaixa, type Dados } from './dados'
import { imprimirPedido } from './impressao'
import { CampoNumero, Cartao, Modal, btn } from './ui'

export default function Painel({ dados, irPara }: { dados: Dados; irPara: (aba: 'caixa') => void }) {
  const { caixaAberto, pedidos, setPedidos, produtos, setCaixas, config } = dados
  const [repor, setRepor] = useState<{ produtoId: string; nome: string } | null>(null)
  const [qtdRepor, setQtdRepor] = useState(0)
  const [verTodos, setVerTodos] = useState(false)

  if (!caixaAberto) {
    return (
      <div className="mx-auto mt-16 max-w-md text-center">
        <p className="text-lg text-stone-600">Nenhum caixa aberto. O painel mostra as vendas do caixa atual.</p>
        <button className={`${btn.primario} mt-4`} onClick={() => irPara('caixa')}>
          Abrir caixa
        </button>
      </div>
    )
  }

  const r = resumirCaixa(caixaAberto, pedidos, produtos)
  const doCaixa = pedidos.filter((p) => p.caixaId === caixaAberto.id).slice().reverse()
  const naFila = doCaixa.filter((p) => !p.entregue && !p.cancelado)
  const lista = verTodos ? doCaixa : doCaixa.slice(0, 15)
  const comEstoque = r.porProduto.filter((l) => l.estoque !== undefined)
  const totalEstoque = comEstoque.reduce((s, l) => s + (l.estoque ?? 0), 0)
  const totalRestante = comEstoque.reduce((s, l) => s + Math.max(0, l.restante ?? 0), 0)

  const atualizar = (id: string, mudanca: Partial<(typeof pedidos)[number]>) =>
    setPedidos((ps) => ps.map((p) => (p.id === id ? { ...p, ...mudanca } : p)))

  function confirmarRepor() {
    if (!repor) return
    setCaixas((cs) =>
      cs.map((c) =>
        c.id === caixaAberto!.id ? { ...c, estoque: { ...c.estoque, [repor.produtoId]: (c.estoque[repor.produtoId] ?? 0) + qtdRepor } } : c,
      ),
    )
    setRepor(null)
    setQtdRepor(0)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Cartao titulo="Faturamento" valor={brl(r.faturamento)} detalhe={`${r.qtdPedidos} pedidos · ticket ${brl(r.ticketMedio)}`} cor="azul" />
        <Cartao titulo="Espetos vendidos" valor={r.espetosVendidos} detalhe={`${r.itensVendidos} itens no total`} cor="laranja" />
        <Cartao
          titulo="Restam (do que preparou)"
          valor={comEstoque.length ? totalRestante : '—'}
          detalhe={comEstoque.length ? `de ${totalEstoque} preparados` : 'sem controle de estoque'}
        />
        <Cartao
          titulo="Lucro até agora"
          valor={brl(r.lucroLiquido)}
          detalhe={`margem ${pct(r.margem)} · já descontado custo, taxas e despesas`}
          cor={r.lucroLiquido >= 0 ? 'verde' : 'vermelho'}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border-2 border-stone-200 bg-white p-4">
          <h2 className="mb-3 text-lg font-extrabold">Vendidos × restantes</h2>
          {r.porProduto.length === 0 && <p className="text-stone-500">Nenhuma venda ainda.</p>}
          <ul className="space-y-3">
            {r.porProduto.map((l) => {
              const prop = l.estoque ? Math.min(100, (l.vendidos / l.estoque) * 100) : 0
              const pouco = l.restante !== undefined && l.restante <= config.alertaEstoque
              return (
                <li key={l.produtoId}>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{l.emoji}</span>
                    <span className="flex-1 font-bold">{l.nome}</span>
                    <span className="text-sm text-stone-600">
                      vendeu <b className="text-lg text-stone-900">{l.vendidos}</b>
                    </span>
                    {l.restante !== undefined && (
                      <span className={`rounded-full px-2.5 py-0.5 text-sm font-bold ${pouco ? 'bg-red-600 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                        {l.restante <= 0 ? 'acabou' : `restam ${l.restante}`}
                      </span>
                    )}
                    <button
                      className="rounded-lg px-2 py-1 text-sm font-semibold text-orange-700 hover:bg-orange-50"
                      onClick={() => setRepor({ produtoId: l.produtoId, nome: l.nome })}
                    >
                      + repor
                    </button>
                  </div>
                  {l.estoque !== undefined && (
                    <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-stone-100">
                      <div className={`h-full ${pouco ? 'bg-red-500' : 'bg-orange-500'}`} style={{ width: `${prop}%` }} />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
          {produtos.some((p) => p.ativo && caixaAberto.estoque[p.id] === undefined && !r.porProduto.some((l) => l.produtoId === p.id)) && (
            <details className="mt-4 text-sm">
              <summary className="cursor-pointer font-semibold text-stone-600">Controlar estoque de outro produto</summary>
              <div className="mt-2 flex flex-wrap gap-2">
                {produtos
                  .filter((p) => p.ativo && caixaAberto.estoque[p.id] === undefined && !r.porProduto.some((l) => l.produtoId === p.id))
                  .map((p) => (
                    <button key={p.id} className={btn.secundario} onClick={() => setRepor({ produtoId: p.id, nome: p.nome })}>
                      {p.emoji} {p.nome}
                    </button>
                  ))}
              </div>
            </details>
          )}
        </section>

        <section className="rounded-2xl border-2 border-stone-200 bg-white p-4">
          <h2 className="mb-3 text-lg font-extrabold">Por forma de pagamento</h2>
          <ul className="space-y-2">
            {(Object.keys(r.porForma) as (keyof typeof r.porForma)[]).map((f) => (
              <li key={f} className="flex justify-between border-b border-stone-100 pb-1">
                <span>{NOMES_FORMA[f]}</span>
                <b>{brl(r.porForma[f])}</b>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Cartao titulo="💵 Dinheiro na gaveta" valor={brl(r.dinheiroEsperado)} detalhe={`troco inicial ${brl(r.trocoInicial)}`} />
            <Cartao titulo="🏦 Em conta" valor={brl(r.emConta)} detalhe={`já sem taxas (${brl(r.taxas)})`} />
          </div>
          <div className="mt-4 space-y-1 text-sm text-stone-600">
            <div className="flex justify-between">
              <span>Custo dos produtos vendidos</span>
              <b>{brl(r.cmv)}</b>
            </div>
            <div className="flex justify-between">
              <span>Despesas do dia</span>
              <b>{brl(r.despesas)}</b>
            </div>
            <div className="flex justify-between">
              <span>Pedidos para viagem</span>
              <b>{r.qtdViagem}</b>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border-2 border-stone-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">
            Pedidos {naFila.length > 0 && <span className="ml-2 rounded-full bg-orange-600 px-2.5 py-0.5 text-sm text-white">{naFila.length} na brasa</span>}
          </h2>
        </div>
        {doCaixa.length === 0 && <p className="text-stone-500">Nenhum pedido ainda.</p>}
        <ul className="divide-y divide-stone-100">
          {lista.map((p) => (
            <li key={p.id} className={`flex flex-wrap items-center gap-3 py-3 ${p.cancelado ? 'opacity-50' : ''}`}>
              <div className="w-16 text-center">
                <div className="text-2xl font-black">{String(p.numero).padStart(3, '0')}</div>
                <div className="text-xs text-stone-500">{hora(p.criadoEm)}</div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {p.cliente && <b>{p.cliente}</b>}
                  {p.viagem && <span className="rounded bg-orange-100 px-1.5 text-xs font-bold text-orange-800">VIAGEM</span>}
                  {p.cancelado ? (
                    <span className="rounded bg-red-100 px-1.5 text-xs font-bold text-red-800">CANCELADO</span>
                  ) : p.entregue ? (
                    <span className="rounded bg-emerald-100 px-1.5 text-xs font-bold text-emerald-800">ENTREGUE</span>
                  ) : (
                    <span className="rounded bg-yellow-100 px-1.5 text-xs font-bold text-yellow-800">PREPARANDO</span>
                  )}
                </div>
                <div className="truncate text-sm text-stone-600">
                  {p.itens.map((i) => `${i.qtd}x ${i.nome}${i.obs ? ` (${i.obs})` : ''}`).join(' · ')}
                </div>
                <div className="text-sm">
                  <b>{brl(p.total)}</b> · {p.pagamentos.map((pg) => NOMES_FORMA[pg.forma]).join(' + ')}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {!p.cancelado && !p.entregue && (
                  <button className={btn.verde + ' !py-2'} onClick={() => atualizar(p.id, { entregue: true })}>
                    Entregue
                  </button>
                )}
                <button className={btn.secundario} onClick={() => imprimirPedido(p, config)} title="Reimprimir">
                  🖨️
                </button>
                {!p.cancelado && (
                  <button
                    className={btn.perigo}
                    onClick={() => confirm(`Cancelar o pedido Nº ${p.numero}? Ele sai do faturamento e o estoque volta.`) && atualizar(p.id, { cancelado: true })}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
        {doCaixa.length > 15 && (
          <button className="mt-2 text-sm font-semibold text-orange-700" onClick={() => setVerTodos((v) => !v)}>
            {verTodos ? 'Mostrar menos' : `Ver todos os ${doCaixa.length} pedidos`}
          </button>
        )}
      </section>

      <Modal titulo={`Repor estoque — ${repor?.nome ?? ''}`} aberto={!!repor} aoFechar={() => setRepor(null)}>
        <p className="mb-3 text-stone-600">Quantas unidades a mais você preparou?</p>
        <CampoNumero grande autoFocus valor={qtdRepor} aoMudar={(v) => setQtdRepor(Math.round(v))} sufixo="un" />
        <div className="mt-3 flex gap-2">
          {[5, 10, 20, 50].map((n) => (
            <button key={n} className={btn.secundario} onClick={() => setQtdRepor(n)}>
              {n}
            </button>
          ))}
        </div>
        <button className={`${btn.primario} mt-4 w-full`} disabled={qtdRepor <= 0} onClick={confirmarRepor}>
          Adicionar ao estoque
        </button>
      </Modal>
    </div>
  )
}
