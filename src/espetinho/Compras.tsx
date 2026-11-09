import { useState } from 'react'
import {
  acharPorCodigo,
  arred,
  brl,
  buscarProdutos,
  dataHora,
  fornecedoresConhecidos,
  limparCodigo,
  melhorCompra,
  novoId,
  pct,
  ultimaCompra,
  type Dados,
} from './dados'
import { LerComCamera, cameraLeSuportada, useLeitorCodigo } from './leitor'
import type { MovEstoque, Movimento, Produto } from './tipos'
import { CampoNumero, CampoTexto, Imagem, Modal, btn } from './ui'

/** Bebidas/produtos de revenda: sem ficha (não são montados) e sem componentes (não são fardo/combo). */
export const ehRevenda = (p: Produto) => !p.ficha.length && !p.componentes?.length && p.categoria !== 'espeto'

interface LinhaCompra {
  produtoId: string
  porCaixa: boolean
  caixas: number
  porCaixaUn: number
  unidades: number
  total: number
  precoVenda: number
}

const unidadesDa = (l: LinhaCompra) => (l.porCaixa ? l.caixas * l.porCaixaUn : l.unidades)

export default function Compras({ dados }: { dados: Dados }) {
  const { movEstoque } = dados
  const [nova, setNova] = useState(false)
  const [aberta, setAberta] = useState<string | null>(null)

  // agrupa as linhas de compra por nota (compraId); compras antigas sem nota viram uma cada
  const notas = new Map<string, MovEstoque[]>()
  for (const m of movEstoque) {
    if (m.tipo !== 'compra') continue
    const k = m.compraId ?? m.id
    notas.set(k, [...(notas.get(k) ?? []), m])
  }
  const lista = [...notas.entries()].reverse()
  const mes = new Date().toISOString().slice(0, 7)
  const totalMes = movEstoque.filter((m) => m.tipo === 'compra' && m.criadoEm.slice(0, 7) === mes).reduce((s, m) => s + (m.valor ?? 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold">Compras</h2>
          <p className="text-sm text-stone-600">
            Lance a nota do fornecedor: bipe cada bebida, diga quantas caixas e quanto pagou. Estoque e custo se atualizam. Comprado este mês:{' '}
            <b>{brl(totalMes)}</b>
          </p>
        </div>
        <button className={`${btn.primario} text-lg`} onClick={() => setNova(true)}>
          + Nova compra
        </button>
      </div>

      {lista.length === 0 && <div className="rounded-2xl border-2 border-dashed border-stone-300 bg-white p-10 text-center text-stone-500">Nenhuma compra lançada.</div>}
      <ul className="space-y-2">
        {lista.map(([id, linhas]) => {
          const total = linhas.reduce((s, m) => s + (m.valor ?? 0), 0)
          const forn = linhas[0].fornecedor
          return (
            <li key={id} className="rounded-2xl border-2 border-stone-200 bg-white">
              <button className="flex w-full flex-wrap items-center gap-3 p-3 text-left" onClick={() => setAberta(aberta === id ? null : id)}>
                <span className="w-32 text-sm text-stone-500">{dataHora(linhas[0].criadoEm)}</span>
                <span className="flex-1 font-bold">{forn || <span className="text-stone-400">sem fornecedor</span>}</span>
                <span className="text-sm text-stone-600">
                  {linhas.length} {linhas.length === 1 ? 'item' : 'itens'}
                </span>
                <b>{brl(total)}</b>
              </button>
              {aberta === id && (
                <ul className="border-t border-stone-100 px-3 pb-3 text-sm">
                  {linhas.map((m) => (
                    <li key={m.id} className="flex justify-between py-1">
                      <span>
                        {m.qtd.toLocaleString('pt-BR')} {m.unidade} · {m.nome}
                      </span>
                      <span>
                        {brl(m.valor ?? 0)} <span className="text-stone-400">({brl((m.valor ?? 0) / m.qtd)}/{m.unidade})</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>

      {nova && <ModalNovaCompra dados={dados} aoFechar={() => setNova(false)} />}
    </div>
  )
}

function ModalNovaCompra({ dados, aoFechar }: { dados: Dados; aoFechar: () => void }) {
  const { produtos, movEstoque, caixaAberto } = dados
  const revenda = produtos.filter(ehRevenda)
  const [fornecedor, setFornecedor] = useState('')
  const [linhas, setLinhas] = useState<LinhaCompra[]>([])
  const [busca, setBusca] = useState('')
  const [daGaveta, setDaGaveta] = useState(false)
  const [codigoNovo, setCodigoNovo] = useState<string | null>(null)
  const [camera, setCamera] = useState(false)
  const prod = (id: string) => produtos.find((p) => p.id === id)!

  function incluir(p: Produto) {
    setLinhas((ls) => {
      const ja = ls.findIndex((l) => l.produtoId === p.id)
      if (ja >= 0) return ls.map((l, i) => (i === ja ? (l.porCaixa ? { ...l, caixas: l.caixas + 1 } : { ...l, unidades: l.unidades + 1 }) : l))
      const ult = ultimaCompra(movEstoque, p.id)
      const uc = p.unidadesCaixa ?? 12
      const custo = ult?.unitario ?? p.custoDireto
      return [...ls, { produtoId: p.id, porCaixa: true, caixas: 1, porCaixaUn: uc, unidades: uc, total: arred(custo * uc), precoVenda: p.preco }]
    })
    setBusca('')
  }

  function lerCodigo(c: string) {
    const p = acharPorCodigo(produtos, c)
    if (p && ehRevenda(p)) incluir(p)
    else setCodigoNovo(limparCodigo(c))
  }
  // a compra é uma janela: o leitor vale aqui dentro (menos com outra janela por cima)
  useLeitorCodigo(!codigoNovo && !camera, lerCodigo, true)

  const muda = (i: number, m: Partial<LinhaCompra>) => setLinhas((ls) => ls.map((l, j) => (j === i ? { ...l, ...m } : l)))
  const total = arred(linhas.reduce((s, l) => s + l.total, 0))
  const resultados = busca.trim() ? buscarProdutos(revenda, busca).slice(0, 8) : []

  function salvar() {
    const compraId = novoId()
    const agora = new Date().toISOString()
    const movs: MovEstoque[] = []
    dados.setProdutos((ps) =>
      ps.map((p) => {
        const l = linhas.find((x) => x.produtoId === p.id)
        if (!l) return p
        const un = unidadesDa(l)
        if (un <= 0) return p
        const estoqueAtual = Math.max(0, p.estoque ?? 0)
        // custo médio: o que tinha + o que chegou
        const custo = l.total > 0 ? (estoqueAtual * p.custoDireto + l.total) / (estoqueAtual + un) : p.custoDireto
        return {
          ...p,
          estoque: (p.estoque ?? 0) + un,
          custoDireto: arred(custo),
          preco: l.precoVenda > 0 ? l.precoVenda : p.preco,
          ...(l.porCaixa ? { unidadesCaixa: l.porCaixaUn } : {}),
        }
      }),
    )
    for (const l of linhas) {
      const un = unidadesDa(l)
      if (un <= 0) continue
      movs.push({
        id: novoId(),
        criadoEm: agora,
        tipo: 'compra',
        produtoId: l.produtoId,
        nome: prod(l.produtoId).nome,
        qtd: un,
        unidade: 'un',
        valor: l.total,
        fornecedor: fornecedor.trim() || undefined,
        compraId,
        obs: l.porCaixa ? `${l.caixas} cx × ${l.porCaixaUn}` : undefined,
      })
    }
    dados.setMovEstoque((ms) => [...ms, ...movs])
    if (daGaveta && caixaAberto && total > 0) {
      const mov: Movimento = {
        id: novoId(),
        tipo: 'sangria',
        descricao: `Compra${fornecedor.trim() ? ` ${fornecedor.trim()}` : ''}`,
        valor: total,
        origem: 'dinheiro',
        criadoEm: agora,
      }
      dados.setCaixas((cs) => cs.map((c) => (c.id === caixaAberto.id ? { ...c, movimentos: [...c.movimentos, mov] } : c)))
    }
    aoFechar()
  }

  return (
    <Modal titulo="🧾 Nova compra" aberto aoFechar={aoFechar} largo>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-stone-600">Fornecedor</span>
          <input
            list="fornecedores"
            className="w-full rounded-xl border-2 border-stone-200 px-3 py-2 outline-none focus:border-orange-500"
            placeholder="Ex.: Distribuidora Silva, Atacadão"
            value={fornecedor}
            onChange={(e) => setFornecedor(e.target.value)}
          />
          <datalist id="fornecedores">
            {fornecedoresConhecidos(movEstoque).map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </label>
      </div>

      <div className="relative mt-3 flex gap-2">
        <input
          className="min-w-0 flex-1 rounded-xl border-2 border-orange-300 px-3 py-3 text-lg outline-none focus:border-orange-500"
          autoFocus
          placeholder="🔎 Bipe o código ou digite o nome da bebida…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter' || !busca.trim()) return
            e.preventDefault()
            const p = acharPorCodigo(produtos, busca)
            if (p && ehRevenda(p)) incluir(p)
            else if (resultados.length === 1) incluir(resultados[0])
            else if (/^\d{6,}$/.test(busca.trim())) {
              setCodigoNovo(limparCodigo(busca))
              setBusca('')
            }
          }}
        />
        {cameraLeSuportada() && (
          <button className="rounded-xl bg-white px-4 text-2xl ring-2 ring-stone-200" onClick={() => setCamera(true)}>
            📷
          </button>
        )}
        {resultados.length > 0 && (
          <ul className="absolute inset-x-0 top-full z-10 mt-1 max-h-64 overflow-y-auto rounded-xl border-2 border-stone-200 bg-white shadow-xl">
            {resultados.map((p) => (
              <li key={p.id}>
                <button className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-orange-50" onClick={() => incluir(p)}>
                  <Imagem emoji={p.emoji} imagem={p.imagem} className="h-8 w-8 shrink-0 rounded text-xl" />
                  <span className="flex-1 font-semibold">{p.nome}</span>
                  <span className="text-xs text-stone-500">estoque {p.estoque ?? '—'}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {linhas.length === 0 && <p className="py-8 text-center text-stone-400">Bipe ou busque as bebidas da nota.</p>}
      <ul className="mt-3 space-y-2">
        {linhas.map((l, i) => {
          const p = prod(l.produtoId)
          const un = unidadesDa(l)
          const unit = un > 0 ? l.total / un : 0
          const ult = ultimaCompra(movEstoque, p.id)
          const melhor = melhorCompra(movEstoque, p.id)
          const variacao = ult && ult.unitario > 0 ? ((unit - ult.unitario) / ult.unitario) * 100 : 0
          const margem = l.precoVenda > 0 ? ((l.precoVenda - unit) / l.precoVenda) * 100 : 0
          return (
            <li key={l.produtoId} className="rounded-xl border-2 border-stone-200 p-3">
              <div className="flex items-center gap-2">
                <Imagem emoji={p.emoji} imagem={p.imagem} className="h-9 w-9 shrink-0 rounded text-2xl" />
                <span className="flex-1 font-extrabold">{p.nome}</span>
                <span className="text-xs text-stone-500">tem {p.estoque ?? 0}</span>
                <button className="px-1 text-xl text-stone-400 hover:text-red-600" onClick={() => setLinhas((ls) => ls.filter((_, j) => j !== i))}>
                  ×
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <div className="flex gap-1 pb-2 text-xs font-bold">
                  {[
                    [true, 'Caixas'],
                    [false, 'Unidades'],
                  ].map(([cx, r]) => (
                    <button
                      key={String(cx)}
                      className={`rounded-full px-2.5 py-1 ${l.porCaixa === cx ? 'bg-stone-900 text-white' : 'bg-stone-100'}`}
                      onClick={() => muda(i, { porCaixa: cx as boolean, unidades: un })}
                    >
                      {r as string}
                    </button>
                  ))}
                </div>
                {l.porCaixa ? (
                  <>
                    <CampoNumero className="w-24" rotulo="Caixas" valor={l.caixas} aoMudar={(v) => muda(i, { caixas: Math.round(v) })} />
                    <CampoNumero className="w-24" rotulo="Un. por cx" valor={l.porCaixaUn} aoMudar={(v) => muda(i, { porCaixaUn: Math.round(v) })} />
                  </>
                ) : (
                  <CampoNumero className="w-28" rotulo="Unidades" valor={l.unidades} aoMudar={(v) => muda(i, { unidades: Math.round(v) })} />
                )}
                <CampoNumero className="w-32" rotulo="Total pago" prefixo="R$" valor={l.total} aoMudar={(v) => muda(i, { total: v })} />
                <CampoNumero
                  className="w-32"
                  rotulo="ou por unidade"
                  prefixo="R$"
                  valor={arred(unit)}
                  aoMudar={(v) => muda(i, { total: arred(v * un) })}
                />
                <CampoNumero className="w-32" rotulo="Vender por" prefixo="R$" valor={l.precoVenda} aoMudar={(v) => muda(i, { precoVenda: v })} />
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 text-xs">
                <span>
                  = <b>{un}</b> un a <b>{brl(unit)}</b>
                </span>
                {l.precoVenda > 0 && <span className={margem < 25 ? 'font-bold text-red-700' : 'text-emerald-700'}>margem {pct(margem)}</span>}
                {ult && (
                  <span className={Math.abs(variacao) < 0.5 ? 'text-stone-500' : variacao > 0 ? 'font-bold text-red-700' : 'font-bold text-emerald-700'}>
                    última: {brl(ult.unitario)}
                    {ult.fornecedor ? ` (${ult.fornecedor})` : ''} {Math.abs(variacao) >= 0.5 && `${variacao > 0 ? '▲' : '▼'} ${pct(Math.abs(variacao))}`}
                  </span>
                )}
                {melhor && ult && melhor.unitario < ult.unitario - 0.004 && (
                  <span className="text-sky-700">
                    mais barato em 90 dias: {brl(melhor.unitario)}
                    {melhor.fornecedor ? ` (${melhor.fornecedor})` : ''}
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <div className="sticky -bottom-4 -mx-4 mt-4 border-t-2 border-stone-200 bg-white px-4 pb-4 pt-3 sm:-bottom-6 sm:-mx-6 sm:px-6 sm:pb-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex-1 text-lg">
            Total da nota: <b className="text-2xl">{brl(total)}</b>
          </span>
          {caixaAberto && (
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" className="h-5 w-5 accent-orange-600" checked={daGaveta} onChange={(e) => setDaGaveta(e.target.checked)} />
              Paguei com dinheiro da gaveta
            </label>
          )}
          <button className={btn.verde} disabled={!linhas.some((l) => unidadesDa(l) > 0)} onClick={salvar}>
            ✔ Lançar compra
          </button>
        </div>
      </div>

      {camera && (
        <LerComCamera
          aoFechar={() => setCamera(false)}
          aoLer={(c) => {
            setCamera(false)
            lerCodigo(c)
          }}
        />
      )}
      {codigoNovo && (
        <ModalProdutoNovo
          codigo={codigoNovo}
          revenda={revenda}
          aoFechar={() => setCodigoNovo(null)}
          aoEscolher={(p, novo) => {
            if (novo) dados.setProdutos((ps) => [...ps, p])
            else dados.setProdutos((ps) => ps.map((x) => (x.id === p.id ? { ...x, codigos: [...(x.codigos ?? []), codigoNovo] } : x)))
            setCodigoNovo(null)
            // espera o produto entrar na lista
            setTimeout(() => incluir({ ...p, codigos: [...(p.codigos ?? []), codigoNovo] }), 0)
          }}
        />
      )}
    </Modal>
  )
}

/** Código que não existe: vincula a um produto ou cadastra a bebida nova na hora. */
function ModalProdutoNovo({
  codigo,
  revenda,
  aoFechar,
  aoEscolher,
}: {
  codigo: string
  revenda: Produto[]
  aoFechar: () => void
  aoEscolher: (p: Produto, novo: boolean) => void
}) {
  const [nome, setNome] = useState('')
  const [preco, setPreco] = useState(0)
  const [termo, setTermo] = useState('')
  const lista = termo.trim() ? buscarProdutos(revenda, termo).slice(0, 6) : []
  return (
    <Modal titulo="Bebida nova" aberto aoFechar={aoFechar}>
      <p className="text-sm text-stone-600">
        O código <b className="font-mono">{codigo}</b> não está cadastrado.
      </p>
      <div className="mt-3 rounded-xl bg-orange-50 p-3">
        <div className="font-bold">Cadastrar agora</div>
        <div className="mt-2 grid grid-cols-[1fr_8rem] gap-2">
          <CampoTexto valor={nome} aoMudar={setNome} placeholder="Nome (ex.: Heineken lata 350 ml)" />
          <CampoNumero prefixo="R$" valor={preco} aoMudar={setPreco} />
        </div>
        <button
          className={`${btn.primario} mt-2 w-full !py-2`}
          disabled={!nome.trim()}
          onClick={() =>
            aoEscolher(
              {
                id: novoId(),
                nome: nome.trim(),
                categoria: 'bebida',
                preco,
                emoji: /cerv|chopp|heine|brahma|skol|amstel|corona|budw|stella|itaip/i.test(nome) ? '🍺' : /vinho/i.test(nome) ? '🍷' : '🥤',
                ficha: [],
                custoDireto: 0,
                ativo: true,
                estoque: 0,
                codigos: [codigo],
              },
              true,
            )
          }
        >
          Cadastrar e incluir na compra
        </button>
      </div>
      <div className="mt-3">
        <div className="text-sm font-semibold text-stone-600">…ou é uma bebida que já existe?</div>
        <input
          className="mt-1 w-full rounded-xl border-2 border-stone-200 px-3 py-2"
          placeholder="Buscar…"
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
        />
        <ul className="mt-1 divide-y divide-stone-100">
          {lista.map((p) => (
            <li key={p.id}>
              <button className="w-full py-2 text-left font-semibold hover:bg-stone-50" onClick={() => aoEscolher(p, false)}>
                {p.emoji} {p.nome}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  )
}
