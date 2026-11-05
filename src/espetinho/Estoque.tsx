import { useState } from 'react'
import { arred, brl, custoUnitarioInsumo, dataHora, novoId, unidadeFicha, type Dados } from './dados'
import type { Insumo, MovEstoque, Movimento, Produto } from './tipos'
import { CampoNumero, CampoTexto, Imagem, Modal, btn } from './ui'

const fmtQtd = (v: number, u: string) => `${(Math.round(v * 1000) / 1000).toLocaleString('pt-BR')} ${u}`

type Acao =
  | { tipo: 'compraInsumo'; insumo: Insumo }
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
          <h2 className="text-lg font-extrabold">🥩 Carnes e insumos (em kg)</h2>
          <ul className="mt-3 divide-y divide-stone-100">
            {insumosControlados.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{i.nome}</div>
                  <div className="text-xs text-stone-500">
                    custo {brl(custoUnitarioInsumo(i))}/{i.unidade}
                  </div>
                </div>
                <div className={`text-xl font-black ${(i.estoque ?? 0) <= 0 ? 'text-red-600' : ''}`}>{fmtQtd(i.estoque ?? 0, i.unidade)}</div>
                <div className="flex gap-1">
                  <button className={btn.secundario + ' !px-3 !py-1.5 text-sm'} onClick={() => setAcao({ tipo: 'compraInsumo', insumo: i })}>
                    + Chegou compra
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

      <section className="rounded-2xl border-2 border-stone-200 bg-white p-4">
        <h2 className="text-lg font-extrabold">Histórico do estoque</h2>
        {historico.length === 0 && <p className="text-sm text-stone-500">Nada lançado ainda.</p>}
        <ul className="mt-2 divide-y divide-stone-100 text-sm">
          {(verTudo ? historico : historico.slice(0, 20)).map((m) => (
            <li key={m.id} className="flex flex-wrap gap-x-3 py-2">
              <span className="w-24 text-stone-500">{dataHora(m.criadoEm)}</span>
              <span className="w-24 font-bold capitalize">{m.tipo === 'montagem' ? 'Montagem' : m.tipo === 'compra' ? 'Compra' : 'Contagem'}</span>
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
      {acao?.tipo === 'compraProduto' && <ModalCompra dados={dados} alvo={{ produto: acao.produto }} aoFechar={() => setAcao(null)} />}
      {acao?.tipo === 'montar' && <ModalMontar dados={dados} inicial={acao.produto} aoFechar={() => setAcao(null)} />}
      {acao?.tipo === 'contarInsumo' && <ModalContagem dados={dados} alvo={{ insumo: acao.insumo }} aoFechar={() => setAcao(null)} />}
      {acao?.tipo === 'contarProduto' && <ModalContagem dados={dados} alvo={{ produto: acao.produto }} aoFechar={() => setAcao(null)} />}
    </div>
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

function ModalCompra({ dados, alvo, aoFechar }: { dados: Dados; alvo: { insumo?: Insumo; produto?: Produto }; aoFechar: () => void }) {
  const { insumo, produto } = alvo
  const unidade = insumo ? insumo.unidade : 'un'
  const nome = insumo?.nome ?? produto!.nome
  const [qtd, setQtd] = useState(0)
  const [valor, setValor] = useState(0)
  const [daGaveta, setDaGaveta] = useState(false)
  const unit = qtd > 0 ? valor / qtd : 0

  function salvar() {
    if (insumo) {
      const novo = custoMedio(insumo.estoque ?? 0, custoUnitarioInsumo(insumo), qtd, valor)
      dados.setInsumos((is) =>
        is.map((i) => (i.id === insumo.id ? { ...i, estoque: arred((i.estoque ?? 0) + qtd), precoCompra: arred(novo * 1000) / 1000, qtdCompra: 1 } : i)),
      )
    } else if (produto) {
      const novo = custoMedio(produto.estoque ?? 0, produto.custoDireto, qtd, valor)
      dados.setProdutos((ps) => ps.map((p) => (p.id === produto.id ? { ...p, estoque: (p.estoque ?? 0) + qtd, custoDireto: arred(novo) } : p)))
    }
    registrar(dados, { tipo: 'compra', insumoId: insumo?.id, produtoId: produto?.id, nome, qtd, unidade, valor })
    if (daGaveta && dados.caixaAberto) {
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
    <Modal titulo={`Chegou compra — ${nome}`} aberto aoFechar={aoFechar}>
      <div className="grid grid-cols-2 gap-3">
        <CampoNumero rotulo="Quantidade que chegou" sufixo={unidade} grande autoFocus valor={qtd} aoMudar={setQtd} />
        <CampoNumero rotulo="Valor pago (total)" prefixo="R$" grande valor={valor} aoMudar={setValor} />
      </div>
      {qtd > 0 && valor > 0 && (
        <p className="mt-3 rounded-xl bg-stone-100 p-3 text-center">
          Saiu a <b>{brl(unit)}</b> por {unidade}. O custo usado nos espetos passa a ser a média com o que já tinha.
        </p>
      )}
      {dados.caixaAberto && (
        <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" className="h-5 w-5 accent-orange-600" checked={daGaveta} onChange={(e) => setDaGaveta(e.target.checked)} />
          Paguei com dinheiro da gaveta do caixa (registra a retirada)
        </label>
      )}
      <button className={`${btn.primario} mt-4 w-full`} disabled={qtd <= 0} onClick={salvar}>
        Lançar entrada
      </button>
    </Modal>
  )
}

function ModalMontar({ dados, inicial, aoFechar }: { dados: Dados; inicial?: Produto; aoFechar: () => void }) {
  const opcoes = dados.produtos.filter((p) => p.categoria === 'espeto' && p.estoque !== undefined)
  const [produtoId, setProdutoId] = useState(inicial?.id ?? opcoes[0]?.id ?? '')
  const produto = dados.produtos.find((p) => p.id === produtoId)
  const [qtd, setQtd] = useState(0)
  // consumo real informado (na unidade do insumo: kg, un…); undefined = usa a ficha
  const [real, setReal] = useState<Record<string, number>>({})

  const itens = (produto?.ficha ?? [])
    .map((f) => {
      const ins = dados.insumos.find((i) => i.id === f.insumoId)
      if (!ins || ins.estoque === undefined) return null
      const fator = ins.unidade === 'kg' || ins.unidade === 'L' ? 1000 : 1
      const pelaFicha = (f.qtd * qtd) / fator
      return { ins, porUnidade: f.qtd, pelaFicha, usado: real[ins.id] ?? pelaFicha, fator }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  function salvar() {
    if (!produto || qtd <= 0) return
    dados.setInsumos((is) =>
      is.map((i) => {
        const it = itens.find((x) => x.ins.id === i.id)
        return it ? { ...i, estoque: arred(((i.estoque ?? 0) - it.usado) * 1000) / 1000 } : i
      }),
    )
    dados.setProdutos((ps) => ps.map((p) => (p.id === produto.id ? { ...p, estoque: (p.estoque ?? 0) + qtd } : p)))
    registrar(dados, {
      tipo: 'montagem',
      produtoId: produto.id,
      nome: produto.nome,
      qtd,
      unidade: 'un',
      consumo: itens.map((it) => ({ insumoId: it.ins.id, nome: it.ins.nome, qtd: it.usado, unidade: it.ins.unidade })),
    })
    aoFechar()
  }

  function atualizarFicha(insumoId: string, porUnidade: number) {
    dados.setProdutos((ps) =>
      ps.map((p) => (p.id === produtoId ? { ...p, ficha: p.ficha.map((f) => (f.insumoId === insumoId ? { ...f, qtd: Math.round(porUnidade) } : f)) } : p)),
    )
  }

  return (
    <Modal titulo="Montar espetos" aberto aoFechar={aoFechar}>
      {opcoes.length === 0 ? (
        <p>Nenhum espeto com controle de estoque.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {opcoes.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setProdutoId(p.id)
                  setReal({})
                }}
                className={`flex items-center gap-2 rounded-xl border-4 p-2 font-bold ${produtoId === p.id ? 'border-orange-500 bg-orange-50' : 'border-stone-200'}`}
              >
                <Imagem emoji={p.emoji} imagem={p.imagem} className="h-8 w-8 shrink-0 rounded text-2xl" />
                {p.nome}
              </button>
            ))}
          </div>
          <CampoNumero className="mt-4" rotulo="Quantos espetos ficaram prontos?" sufixo="espetos" grande autoFocus valor={qtd} aoMudar={(v) => setQtd(Math.round(v))} />

          {itens.length > 0 && qtd > 0 && (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-stone-600">Quanto foi usado? Já vem calculado pela ficha — se pesou diferente, corrija.</p>
              {itens.map((it) => {
                const rendimento = qtd > 0 ? (it.usado * it.fator) / qtd : 0
                const diferente = Math.abs(rendimento - it.porUnidade) >= 1 && it.fator > 1
                return (
                  <div key={it.ins.id} className="rounded-xl border-2 border-stone-200 p-3">
                    <div className="flex items-center gap-2">
                      <span className="flex-1 font-semibold">{it.ins.nome}</span>
                      <CampoNumero
                        className="w-36"
                        sufixo={it.ins.unidade}
                        valor={arred(it.usado * 1000) / 1000}
                        aoMudar={(v) => setReal((r) => ({ ...r, [it.ins.id]: v }))}
                      />
                    </div>
                    <div className="mt-1 text-xs text-stone-500">
                      Tem em estoque: {fmtQtd(it.ins.estoque ?? 0, it.ins.unidade)}
                      {it.usado > (it.ins.estoque ?? 0) && <b className="text-red-600"> — vai ficar negativo, lance a compra antes</b>}
                    </div>
                    {it.fator > 1 && (
                      <div className={`mt-1 text-sm ${diferente ? 'font-bold text-amber-700' : 'text-stone-600'}`}>
                        Rendimento: {Math.round(rendimento)} {unidadeFicha(it.ins.unidade)} por espeto (ficha: {it.porUnidade} {unidadeFicha(it.ins.unidade)})
                        {diferente && (
                          <button className="ml-2 underline" onClick={() => atualizarFicha(it.ins.id, rendimento)}>
                            usar {Math.round(rendimento)} na ficha
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          <button className={`${btn.primario} mt-4 w-full py-4 text-lg`} disabled={!produto || qtd <= 0} onClick={salvar}>
            Somar {qtd > 0 ? qtd : ''} espetos prontos
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
