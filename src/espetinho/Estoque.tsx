import { useState } from 'react'
import { arred, brl, custoUnitarioInsumo, dataHora, novoId, rendePara, unidadeFicha, type Dados } from './dados'
import type { Insumo, MovEstoque, Movimento, Produto } from './tipos'
import { CampoNumero, CampoTexto, Imagem, Modal, btn } from './ui'

const fmtQtd = (v: number, u: string) => `${(Math.round(v * 1000) / 1000).toLocaleString('pt-BR')} ${u}`

type Acao =
  | { tipo: 'compraInsumo'; insumo: Insumo }
  | { tipo: 'preparo'; insumo: Insumo }
  | { tipo: 'compraProduto'; produto: Produto }
  | { tipo: 'montar'; produto?: Produto }
  | { tipo: 'contarInsumo'; insumo: Insumo }
  | { tipo: 'contarProduto'; produto: Produto }

/**
 * Fluxo: a carne chega em kg (compra) → vira espetos (montagem, baixa os kg) → espetos saem nas vendas.
 * Bebidas entram direto em unidades (compra). Contagem corrige diferenças e registra perdas.
 */
export default function Estoque({ dados }: { dados: Dados }) {
  const { insumos, produtos, movEstoque } = dados
  const [acao, setAcao] = useState<Acao | null>(null)
  const [verTudo, setVerTudo] = useState(false)

  const insumosControlados = insumos.filter((i) => i.estoque !== undefined)
  const insumosSemControle = insumos.filter((i) => i.estoque === undefined)
  const espetos = produtos.filter((p) => p.categoria === 'espeto' && p.estoque !== undefined)
  const prontosComprados = produtos.filter((p) => p.categoria !== 'espeto' && p.estoque !== undefined)
  const historico = movEstoque.slice().reverse()

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-orange-50 p-4 text-sm text-orange-950">
        <b>Como funciona:</b> quando a carne chega, lance em <b>“Chegou compra”</b> (em kg, com o valor pago — o custo se atualiza). Ao espetar, use{' '}
        <b>“Montar espetos”</b>: informe quantos espetos saíram e quantos kg usou. O sistema baixa os kg, soma os espetos prontos e mostra o rendimento
        real. As vendas (inclusive dentro de combos e jantinhas) baixam os espetos prontos.
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border-2 border-stone-200 bg-white p-4">
          <h2 className="text-lg font-extrabold">🥩 Carnes, baião e insumos (em kg)</h2>
          <p className="text-xs text-stone-500">
            <b>Chegou compra</b>: carne/insumo comprado. <b>Preparei</b>: algo feito aqui (ex.: baião) — pese quanto rendeu. O baião sai do estoque a cada jantinha
            vendida, pela porção da ficha.
          </p>
          <ul className="mt-3 divide-y divide-stone-100">
            {insumosControlados.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{i.nome}</div>
                  <div className="text-xs text-stone-500">
                    custo {brl(custoUnitarioInsumo(i))}/{i.unidade}
                  </div>
                  {rendePara(i, produtos).length > 0 && (
                    <div className="text-xs font-semibold text-emerald-700">
                      dá para{' '}
                      {rendePara(i, produtos)
                        .map((x) => `~${x.qtd} ${x.produto.nome.toLowerCase()} (${x.porcao} ${x.unidadePorcao})`)
                        .join(' · ')}
                    </div>
                  )}
                </div>
                <div className={`text-xl font-black ${(i.estoque ?? 0) <= 0 ? 'text-red-600' : ''}`}>{fmtQtd(i.estoque ?? 0, i.unidade)}</div>
                <div className="flex gap-1">
                  <button className={btn.secundario + ' !px-3 !py-1.5 text-sm'} onClick={() => setAcao({ tipo: 'compraInsumo', insumo: i })}>
                    + Chegou compra
                  </button>
                  <button className={btn.secundario + ' !px-3 !py-1.5 text-sm'} onClick={() => setAcao({ tipo: 'preparo', insumo: i })}>
                    + Preparei
                  </button>
                  <button className={btn.secundario + ' !px-3 !py-1.5 text-sm'} onClick={() => setAcao({ tipo: 'contarInsumo', insumo: i })}>
                    Contagem
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {insumosSemControle.length > 0 && (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer font-semibold text-stone-600">Controlar estoque de outro insumo</summary>
              <div className="mt-2 flex flex-wrap gap-2">
                {insumosSemControle.map((i) => (
                  <button key={i.id} className={btn.secundario + ' !py-1 text-sm'} onClick={() => dados.setInsumos((is) => is.map((x) => (x.id === i.id ? { ...x, estoque: 0 } : x)))}>
                    {i.nome}
                  </button>
                ))}
              </div>
            </details>
          )}
        </section>

        <section className="rounded-2xl border-2 border-stone-200 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-extrabold">🍢 Espetos prontos</h2>
            <button className={btn.primario + ' !py-2'} onClick={() => setAcao({ tipo: 'montar' })}>
              Montar espetos
            </button>
          </div>
          <ul className="mt-3 divide-y divide-stone-100">
            {espetos.map((p) => (
              <li key={p.id} className="flex items-center gap-2 py-2">
                <Imagem emoji={p.emoji} imagem={p.imagem} className="h-10 w-10 shrink-0 rounded-lg text-2xl" />
                <span className="flex-1 font-bold">{p.nome}</span>
                <span className={`text-xl font-black ${(p.estoque ?? 0) <= dados.config.alertaEstoque ? 'text-red-600' : ''}`}>{p.estoque} un</span>
                <button className={btn.secundario + ' !px-3 !py-1.5 text-sm'} onClick={() => setAcao({ tipo: 'montar', produto: p })}>
                  + Montar
                </button>
                <button className={btn.secundario + ' !px-3 !py-1.5 text-sm'} onClick={() => setAcao({ tipo: 'contarProduto', produto: p })}>
                  Contagem
                </button>
              </li>
            ))}
          </ul>
          {espetos.length === 0 && <p className="text-sm text-stone-500">Nenhum espeto com controle de estoque. Ative em Cadastros → editar produto.</p>}

          {prontosComprados.length > 0 && (
            <>
              <h3 className="mt-5 font-extrabold">🥤 Bebidas e outros (em unidades)</h3>
              <ul className="mt-2 divide-y divide-stone-100">
                {prontosComprados.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 py-2">
                    <Imagem emoji={p.emoji} imagem={p.imagem} className="h-10 w-10 shrink-0 rounded-lg text-2xl" />
                    <span className="flex-1 font-bold">{p.nome}</span>
                    <span className={`text-xl font-black ${(p.estoque ?? 0) <= dados.config.alertaEstoque ? 'text-red-600' : ''}`}>{p.estoque} un</span>
                    <button className={btn.secundario + ' !px-3 !py-1.5 text-sm'} onClick={() => setAcao({ tipo: 'compraProduto', produto: p })}>
                      + Compra
                    </button>
                    <button className={btn.secundario + ' !px-3 !py-1.5 text-sm'} onClick={() => setAcao({ tipo: 'contarProduto', produto: p })}>
                      Contagem
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      <ParaOndeFoi movEstoque={movEstoque} />

      <section className="rounded-2xl border-2 border-stone-200 bg-white p-4">
        <h2 className="text-lg font-extrabold">Histórico do estoque</h2>
        {historico.length === 0 && <p className="text-sm text-stone-500">Nada lançado ainda.</p>}
        <ul className="mt-2 divide-y divide-stone-100 text-sm">
          {(verTudo ? historico : historico.slice(0, 20)).map((m) => (
            <li key={m.id} className="flex flex-wrap gap-x-3 py-2">
              <span className="w-24 text-stone-500">{dataHora(m.criadoEm)}</span>
              <span className="w-24 font-bold capitalize">
                {m.tipo === 'montagem' ? 'Montagem' : m.tipo === 'compra' ? 'Compra' : m.tipo === 'preparo' ? 'Preparo' : 'Contagem'}
              </span>
              <span className="min-w-0 flex-1">
                {m.nome}: <b className={m.qtd < 0 ? 'text-red-700' : 'text-emerald-700'}>{m.qtd > 0 ? '+' : ''}{fmtQtd(m.qtd, m.unidade)}</b>
                {m.valor ? ` · ${brl(m.valor)}` : ''}
                {m.consumo?.length ? <span className="text-stone-500"> · usou {m.consumo.map((c) => fmtQtd(c.qtd, c.unidade) + ' ' + c.nome).join(', ')}</span> : null}
                {m.obs ? <span className="text-stone-500"> · {m.obs}</span> : null}
              </span>
            </li>
          ))}
        </ul>
        {historico.length > 20 && (
          <button className="mt-2 text-sm font-semibold text-orange-700" onClick={() => setVerTudo((v) => !v)}>
            {verTudo ? 'Mostrar menos' : `Ver tudo (${historico.length})`}
          </button>
        )}
      </section>

      {acao?.tipo === 'compraInsumo' && <ModalCompra dados={dados} alvo={{ insumo: acao.insumo }} aoFechar={() => setAcao(null)} />}
      {acao?.tipo === 'preparo' && <ModalCompra dados={dados} alvo={{ insumo: acao.insumo }} preparo aoFechar={() => setAcao(null)} />}
      {acao?.tipo === 'compraProduto' && <ModalCompra dados={dados} alvo={{ produto: acao.produto }} aoFechar={() => setAcao(null)} />}
      {acao?.tipo === 'montar' && <ModalMontar dados={dados} inicial={acao.produto} aoFechar={() => setAcao(null)} />}
      {acao?.tipo === 'contarInsumo' && <ModalContagem dados={dados} alvo={{ insumo: acao.insumo }} aoFechar={() => setAcao(null)} />}
      {acao?.tipo === 'contarProduto' && <ModalContagem dados={dados} alvo={{ produto: acao.produto }} aoFechar={() => setAcao(null)} />}
    </div>
  )
}

/** Quanto de cada carne/insumo virou cada espeto (pelas montagens), na semana ou no mês. */
function ParaOndeFoi({ movEstoque }: { movEstoque: MovEstoque[] }) {
  const [dias, setDias] = useState(7)
  const desde = new Date(Date.now() - dias * 86400000).toISOString()
  const mapa = new Map<string, { nome: string; unidade: string; total: number; destinos: Map<string, { qtd: number; espetos: number }> }>()
  for (const m of movEstoque) {
    if (m.tipo !== 'montagem' || m.criadoEm < desde) continue
    for (const c of m.consumo ?? []) {
      const e = mapa.get(c.insumoId) ?? { nome: c.nome, unidade: c.unidade, total: 0, destinos: new Map() }
      e.total += c.qtd
      const d = e.destinos.get(m.nome) ?? { qtd: 0, espetos: 0 }
      d.qtd += c.qtd
      d.espetos += m.qtd
      e.destinos.set(m.nome, d)
      mapa.set(c.insumoId, e)
    }
  }
  const itens = [...mapa.values()].filter((e) => e.unidade === 'kg' || e.unidade === 'L')
  return (
    <section className="rounded-2xl border-2 border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold">Para onde foi a carne</h2>
        <div className="flex gap-1">
          {[
            [7, '7 dias'],
            [30, '30 dias'],
          ].map(([d, r]) => (
            <button
              key={d}
              onClick={() => setDias(d as number)}
              className={`rounded-full px-3 py-1 text-sm font-bold ${dias === d ? 'bg-stone-900 text-white' : 'bg-stone-100'}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      {itens.length === 0 && <p className="mt-2 text-sm text-stone-500">Nenhuma montagem no período.</p>}
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {itens.map((e) => (
          <div key={e.nome} className="rounded-xl bg-stone-50 p-3">
            <div className="flex justify-between font-bold">
              <span>{e.nome}</span>
              <span>{fmtQtd(e.total, e.unidade)}</span>
            </div>
            <ul className="mt-2 space-y-1.5">
              {[...e.destinos.entries()].map(([nome, d]) => {
                const pc = e.total > 0 ? (d.qtd / e.total) * 100 : 0
                return (
                  <li key={nome}>
                    <div className="flex justify-between text-sm">
                      <span>
                        {nome} <span className="text-stone-500">({d.espetos} espetos)</span>
                      </span>
                      <span>
                        <b>{fmtQtd(d.qtd, e.unidade)}</b> · {Math.round(pc)}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-stone-200">
                      <div className="h-full bg-orange-500" style={{ width: `${pc}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

function registrar(dados: Dados, m: Omit<MovEstoque, 'id' | 'criadoEm'>) {
  dados.setMovEstoque((ms) => [...ms, { ...m, id: novoId(), criadoEm: new Date().toISOString() }])
}

/** Custo médio ponderado: o que já tinha no estoque + o que chegou. */
function custoMedio(estoqueAtual: number, custoAtual: number, qtd: number, valor: number) {
  const base = Math.max(0, estoqueAtual)
  return base + qtd > 0 ? (base * custoAtual + valor) / (base + qtd) : custoAtual
}

function ModalCompra({
  dados,
  alvo,
  aoFechar,
  preparo,
}: {
  dados: Dados
  alvo: { insumo?: Insumo; produto?: Produto }
  aoFechar: () => void
  preparo?: boolean
}) {
  const { insumo, produto } = alvo
  const unidade = insumo ? insumo.unidade : 'un'
  const nome = insumo?.nome ?? produto!.nome
  const [qtd, setQtd] = useState(0)
  const [valor, setValor] = useState(0)
  const [daGaveta, setDaGaveta] = useState(false)
  const unit = qtd > 0 ? valor / qtd : 0

  const rende = insumo ? rendePara(insumo, dados.produtos, (insumo.estoque ?? 0) + qtd) : []

  function salvar() {
    if (insumo) {
      // sem valor informado, mantém o custo que já estava cadastrado
      const novo = valor > 0 ? custoMedio(insumo.estoque ?? 0, custoUnitarioInsumo(insumo), qtd, valor) : custoUnitarioInsumo(insumo)
      dados.setInsumos((is) =>
        is.map((i) => (i.id === insumo.id ? { ...i, estoque: arred((i.estoque ?? 0) + qtd), precoCompra: arred(novo * 1000) / 1000, qtdCompra: 1 } : i)),
      )
    } else if (produto) {
      const novo = valor > 0 ? custoMedio(produto.estoque ?? 0, produto.custoDireto, qtd, valor) : produto.custoDireto
      dados.setProdutos((ps) => ps.map((p) => (p.id === produto.id ? { ...p, estoque: (p.estoque ?? 0) + qtd, custoDireto: arred(novo) } : p)))
    }
    registrar(dados, { tipo: preparo ? 'preparo' : 'compra', insumoId: insumo?.id, produtoId: produto?.id, nome, qtd, unidade, valor: valor || undefined })
    if (daGaveta && dados.caixaAberto && valor > 0) {
      const mov: Movimento = {
        id: novoId(),
        tipo: 'sangria',
        descricao: `Compra: ${nome}`,
        valor,
        origem: 'dinheiro',
        criadoEm: new Date().toISOString(),
      }
      dados.setCaixas((cs) => cs.map((c) => (c.id === dados.caixaAberto!.id ? { ...c, movimentos: [...c.movimentos, mov] } : c)))
    }
    aoFechar()
  }

  return (
    <Modal titulo={`${preparo ? 'Preparei' : 'Chegou compra'} — ${nome}`} aberto aoFechar={aoFechar}>
      <div className="grid grid-cols-2 gap-3">
        <CampoNumero rotulo={preparo ? 'Quanto rendeu (pesado)' : 'Quantidade que chegou'} sufixo={unidade} grande autoFocus valor={qtd} aoMudar={setQtd} />
        <CampoNumero
          rotulo={preparo ? 'Gasto nos ingredientes (opcional)' : 'Valor pago (total)'}
          prefixo="R$"
          grande
          valor={valor}
          aoMudar={setValor}
        />
      </div>
      {preparo && (
        <p className="mt-2 text-xs text-stone-500">
          Some o que gastou (arroz, feijão, bacon, gás…). Se deixar em branco, mantém o custo por {unidade} já cadastrado.
        </p>
      )}
      {qtd > 0 && valor > 0 && (
        <p className="mt-3 rounded-xl bg-stone-100 p-3 text-center">
          Saiu a <b>{brl(unit)}</b> por {unidade}. O custo passa a ser a média com o que já tinha.
        </p>
      )}
      {qtd > 0 && rende.length > 0 && (
        <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-center text-emerald-900">
          Com o que vai ficar ({((insumo?.estoque ?? 0) + qtd).toLocaleString('pt-BR')} {unidade}), dá para:
          {rende.map((x) => (
            <div key={x.produto.id} className="text-2xl font-black">
              {x.qtd} {x.produto.nome.toLowerCase()}
              <span className="text-sm font-semibold"> ({x.porcao} {x.unidadePorcao} cada)</span>
            </div>
          ))}
          <div className="text-xs">Para mudar a porção, edite a ficha da jantinha em Cadastros.</div>
        </div>
      )}
      {dados.caixaAberto && (
        <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" className="h-5 w-5 accent-orange-600" checked={daGaveta} onChange={(e) => setDaGaveta(e.target.checked)} />
          Paguei com dinheiro da gaveta do caixa (registra a retirada)
        </label>
      )}
      <button className={`${btn.primario} mt-4 w-full`} disabled={qtd <= 0} onClick={salvar}>
        {preparo ? 'Somar ao estoque' : 'Lançar entrada'}
      </button>
    </Modal>
  )
}

/**
 * Montagem de vários espetos de uma vez. Um insumo pode ir para mais de um espeto
 * (ex.: a carne vai para "Carne" e para "Misto"): o quadro mostra quanto vai para cada um e quanto sobra.
 */
function ModalMontar({ dados, inicial, aoFechar }: { dados: Dados; inicial?: Produto; aoFechar: () => void }) {
  const opcoes = dados.produtos.filter((p) => p.categoria === 'espeto' && p.estoque !== undefined)
  const [qtds, setQtds] = useState<Record<string, number>>({})
  // peso real usado, quando pesou diferente da ficha (na unidade do insumo)
  const [real, setReal] = useState<Record<string, number>>({})
  const fatorDe = (ins: Insumo) => (ins.unidade === 'kg' || ins.unidade === 'L' ? 1000 : 1)

  // consumo pela ficha: insumo → produto → quantidade (na unidade do insumo)
  const porInsumo = new Map<string, { ins: Insumo; partes: { produto: Produto; qtd: number }[] }>()
  for (const p of opcoes) {
    const n = qtds[p.id] ?? 0
    if (n <= 0) continue
    for (const f of p.ficha) {
      const ins = dados.insumos.find((i) => i.id === f.insumoId)
      if (!ins || ins.estoque === undefined || f.qtd <= 0) continue
      const linha = porInsumo.get(ins.id) ?? { ins, partes: [] }
      linha.partes.push({ produto: p, qtd: (f.qtd * n) / fatorDe(ins) })
      porInsumo.set(ins.id, linha)
    }
  }
  const linhas = [...porInsumo.values()].map((l) => {
    const pelaFicha = l.partes.reduce((s, x) => s + x.qtd, 0)
    const usado = real[l.ins.id] ?? pelaFicha
    const fatorReal = pelaFicha > 0 ? usado / pelaFicha : 1
    const sobra = (l.ins.estoque ?? 0) - usado
    return { ...l, pelaFicha, usado, fatorReal, sobra }
  })
  const total = Object.values(qtds).reduce((s, n) => s + (n > 0 ? n : 0), 0)

  /** Com a sobra deste insumo, quantos ainda dá de cada espeto que usa ele (limitado pelos outros insumos do espeto). */
  function daMais(insumoId: string) {
    return opcoes.flatMap((p) => {
      const f = p.ficha.find((x) => x.insumoId === insumoId)
      if (!f || f.qtd <= 0) return []
      let n = Infinity
      for (const g of p.ficha) {
        const ins = dados.insumos.find((i) => i.id === g.insumoId)
        if (!ins || ins.estoque === undefined || g.qtd <= 0) continue
        const linha = linhas.find((l) => l.ins.id === ins.id)
        const resta = linha ? linha.sobra : ins.estoque
        n = Math.min(n, Math.floor(Math.max(0, resta) / (g.qtd / fatorDe(ins)) + 1e-6))
      }
      return n === Infinity ? [] : [{ produto: p, n }]
    })
  }

  function salvar() {
    if (total <= 0) return
    dados.setInsumos((is) =>
      is.map((i) => {
        const l = linhas.find((x) => x.ins.id === i.id)
        return l ? { ...i, estoque: arred(((i.estoque ?? 0) - l.usado) * 1000) / 1000 } : i
      }),
    )
    dados.setProdutos((ps) => ps.map((p) => (qtds[p.id] > 0 ? { ...p, estoque: (p.estoque ?? 0) + qtds[p.id] } : p)))
    // um registro por espeto, com o peso real dividido na proporção da ficha
    const agora = new Date().toISOString()
    const novos: MovEstoque[] = opcoes
      .filter((p) => (qtds[p.id] ?? 0) > 0)
      .map((p) => ({
        id: novoId(),
        criadoEm: agora,
        tipo: 'montagem',
        produtoId: p.id,
        nome: p.nome,
        qtd: qtds[p.id],
        unidade: 'un',
        consumo: linhas.flatMap((l) => {
          const parte = l.partes.find((x) => x.produto.id === p.id)
          return parte ? [{ insumoId: l.ins.id, nome: l.ins.nome, qtd: Math.round(parte.qtd * l.fatorReal * 1000) / 1000, unidade: l.ins.unidade }] : []
        }),
      }))
    dados.setMovEstoque((ms) => [...ms, ...novos])
    aoFechar()
  }

  function atualizarFicha(insumoId: string, produtoId: string, porUnidade: number) {
    dados.setProdutos((ps) =>
      ps.map((p) => (p.id === produtoId ? { ...p, ficha: p.ficha.map((f) => (f.insumoId === insumoId ? { ...f, qtd: Math.round(porUnidade) } : f)) } : p)),
    )
  }

  return (
    <Modal titulo="Montar espetos" aberto aoFechar={aoFechar} largo>
      {opcoes.length === 0 ? (
        <p>Nenhum espeto com controle de estoque.</p>
      ) : (
        <>
          <p className="text-sm text-stone-600">Digite quantos de cada espeto você montou. Pode lançar vários de uma vez (ex.: carne, linguiça e misto).</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {opcoes.map((p) => (
              <li key={p.id} className={`flex items-center gap-2 rounded-xl border-2 p-2 ${qtds[p.id] > 0 ? 'border-orange-400 bg-orange-50' : 'border-stone-200'}`}>
                <Imagem emoji={p.emoji} imagem={p.imagem} className="h-9 w-9 shrink-0 rounded text-2xl" />
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{p.nome}</div>
                  <div className="truncate text-xs text-stone-500">
                    {p.ficha
                      .map((f) => {
                        const ins = dados.insumos.find((i) => i.id === f.insumoId)
                        return ins && ins.estoque !== undefined ? `${f.qtd} ${unidadeFicha(ins.unidade)} ${ins.nome.split(' ')[0].toLowerCase()}` : null
                      })
                      .filter(Boolean)
                      .join(' + ') || 'sem insumo controlado'}
                  </div>
                </div>
                <CampoNumero
                  className="w-24"
                  autoFocus={inicial?.id === p.id}
                  valor={qtds[p.id] ?? 0}
                  aoMudar={(v) => setQtds((q) => ({ ...q, [p.id]: Math.round(v) }))}
                />
              </li>
            ))}
          </ul>

          {linhas.length > 0 && (
            <div className="mt-4 space-y-3">
              <h3 className="font-extrabold">Para onde vai cada carne</h3>
              {linhas.map((l) => {
                const u = l.ins.unidade
                const mais = daMais(l.ins.id)
                const unico = l.partes.length === 1 ? l.partes[0] : null
                const rendimento = unico && qtds[unico.produto.id] > 0 ? (l.usado * fatorDe(l.ins)) / qtds[unico.produto.id] : 0
                const fichaUnico = unico?.produto.ficha.find((f) => f.insumoId === l.ins.id)?.qtd ?? 0
                return (
                  <div key={l.ins.id} className="rounded-xl border-2 border-stone-200 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex-1 font-bold">{l.ins.nome}</span>
                      <span className="text-sm text-stone-500">tem {fmtQtd(l.ins.estoque ?? 0, u)}</span>
                    </div>
                    <ul className="mt-1 text-sm">
                      {l.partes.map((x) => (
                        <li key={x.produto.id} className="flex justify-between">
                          <span>
                            → {qtds[x.produto.id]} {x.produto.nome}
                          </span>
                          <b>{fmtQtd(x.qtd * l.fatorReal, u)}</b>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-2 text-sm">
                      <span>Usado no total (pesado):</span>
                      <CampoNumero className="w-32" sufixo={u} valor={arred(l.usado * 1000) / 1000} aoMudar={(v) => setReal((r) => ({ ...r, [l.ins.id]: v }))} />
                      <span className={`ml-auto font-bold ${l.sobra < -0.0005 ? 'text-red-600' : 'text-emerald-700'}`}>
                        {l.sobra < -0.0005 ? `faltam ${fmtQtd(-l.sobra, u)} — lance a compra antes` : `sobra ${fmtQtd(l.sobra, u)}`}
                      </span>
                    </div>
                    {Math.abs(l.fatorReal - 1) >= 0.01 && (
                      <div className="mt-1 text-sm font-semibold text-amber-700">
                        Pesou {l.fatorReal > 1 ? `${Math.round((l.fatorReal - 1) * 100)}% a mais` : `${Math.round((1 - l.fatorReal) * 100)}% a menos`} que a ficha.
                        {unico && Math.abs(rendimento - fichaUnico) >= 1 && (
                          <button className="ml-2 underline" onClick={() => atualizarFicha(l.ins.id, unico.produto.id, rendimento)}>
                            usar {Math.round(rendimento)} {unidadeFicha(u)} na ficha do {unico.produto.nome}
                          </button>
                        )}
                      </div>
                    )}
                    {l.sobra > 0 && mais.length > 0 && (
                      <div className="mt-1 text-xs text-stone-600">
                        Com a sobra ainda dá: {mais.map((m) => `+${m.n} ${m.produto.nome.toLowerCase()}`).join(' ou ')}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          <button className={`${btn.primario} mt-4 w-full py-4 text-lg`} disabled={total <= 0} onClick={salvar}>
            Somar {total > 0 ? total : ''} espetos prontos
          </button>
        </>
      )}
    </Modal>
  )
}

function ModalContagem({ dados, alvo, aoFechar }: { dados: Dados; alvo: { insumo?: Insumo; produto?: Produto }; aoFechar: () => void }) {
  const { insumo, produto } = alvo
  const atual = insumo?.estoque ?? produto?.estoque ?? 0
  const unidade = insumo ? insumo.unidade : 'un'
  const nome = insumo?.nome ?? produto!.nome
  const [contado, setContado] = useState(atual)
  const [motivo, setMotivo] = useState('')
  const dif = arred((contado - atual) * 1000) / 1000

  function salvar() {
    if (insumo) dados.setInsumos((is) => is.map((i) => (i.id === insumo.id ? { ...i, estoque: contado } : i)))
    if (produto) dados.setProdutos((ps) => ps.map((p) => (p.id === produto.id ? { ...p, estoque: Math.round(contado) } : p)))
    if (dif !== 0) registrar(dados, { tipo: 'contagem', insumoId: insumo?.id, produtoId: produto?.id, nome, qtd: dif, unidade, obs: motivo.trim() || undefined })
    aoFechar()
  }

  return (
    <Modal titulo={`Contagem — ${nome}`} aberto aoFechar={aoFechar}>
      <p className="text-stone-600">
        O sistema diz que tem <b>{fmtQtd(atual, unidade)}</b>. Quanto tem de verdade?
      </p>
      <CampoNumero className="mt-3" sufixo={unidade} grande autoFocus valor={contado} aoMudar={setContado} min={-99999} />
      {dif !== 0 && (
        <>
          <p className={`mt-2 font-bold ${dif < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
            {dif < 0 ? `Perda de ${fmtQtd(-dif, unidade)}` : `Sobra de ${fmtQtd(dif, unidade)}`}
          </p>
          <CampoTexto className="mt-2" rotulo="Motivo (opcional)" valor={motivo} aoMudar={setMotivo} placeholder="Ex.: caiu no chão, estragou, comeu" />
        </>
      )}
      <button className={`${btn.primario} mt-4 w-full`} onClick={salvar}>
        Salvar contagem
      </button>
    </Modal>
  )
}
