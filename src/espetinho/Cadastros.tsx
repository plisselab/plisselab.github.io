import { useState } from 'react'
import {
  CATEGORIAS,
  NOMES_CATEGORIA,
  NOMES_UNIDADE,
  arred,
  brl,
  custoCompleto,
  custoItemFicha,
  custoProduto,
  custoUnitarioInsumo,
  novoId,
  pct,
  reduzirImagem,
  unidadeFicha,
  type Dados,
} from './dados'
import type { Insumo, Produto, Unidade } from './tipos'
import { CampoNumero, CampoTexto, Imagem, Modal, btn } from './ui'

const EMOJIS = ['🍛', '🍱', '🍢', '🥩', '🍗', '🌭', '🧀', '❤️', '🧅', '🫑', '🍖', '🥓', '🍤', '🧄', '🍞', '🥣', '🍚', '🥗', '🥤', '🍺', '💧', '🧃', '🍹', '🍫', '🍬', '⭐']

export default function Cadastros({ dados }: { dados: Dados }) {
  const [aba, setAba] = useState<'produtos' | 'insumos'>('produtos')
  return (
    <div>
      <div className="mb-4 flex gap-2">
        {(['produtos', 'insumos'] as const).map((a) => (
          <button
            key={a}
            onClick={() => setAba(a)}
            className={`rounded-full px-5 py-2 font-bold ${aba === a ? 'bg-stone-900 text-white' : 'bg-white text-stone-700 ring-2 ring-stone-200'}`}
          >
            {a === 'produtos' ? 'Produtos (espetos e bebidas)' : 'Insumos (gastos)'}
          </button>
        ))}
      </div>
      {aba === 'produtos' ? <Produtos dados={dados} /> : <Insumos dados={dados} />}
    </div>
  )
}

function Insumos({ dados }: { dados: Dados }) {
  const { insumos, setInsumos, produtos } = dados
  const atualizar = (id: string, m: Partial<Insumo>) => setInsumos((is) => is.map((i) => (i.id === id ? { ...i, ...m } : i)))
  const usadoEm = (id: string) => produtos.filter((p) => p.ficha.some((f) => f.insumoId === id)).map((p) => p.nome)

  return (
    <section className="rounded-2xl border-2 border-stone-200 bg-white p-4">
      <h2 className="text-lg font-extrabold">Insumos</h2>
      <p className="text-sm text-stone-600">
        Cadastre o que você compra e quanto pagou. Ex.: paguei <b>R$ 225</b> em <b>5 kg</b> de alcatra → custa <b>R$ 45/kg</b>. Ao mudar o preço aqui,
        o custo de todos os espetos que usam esse insumo é recalculado.
      </p>
      <div className="mt-4 space-y-3">
        {insumos.map((i) => {
          const usos = usadoEm(i.id)
          return (
            <div key={i.id} className="grid grid-cols-2 items-end gap-2 rounded-xl border-2 border-stone-100 p-3 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
              <CampoTexto className="col-span-2 md:col-span-1" rotulo="Insumo" valor={i.nome} aoMudar={(v) => atualizar(i.id, { nome: v })} />
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-stone-600">Unidade</span>
                <select
                  className="w-full rounded-xl border-2 border-stone-200 bg-white px-2 py-2"
                  value={i.unidade}
                  onChange={(e) => atualizar(i.id, { unidade: e.target.value as Unidade })}
                >
                  {(Object.keys(NOMES_UNIDADE) as Unidade[]).map((u) => (
                    <option key={u} value={u}>
                      {NOMES_UNIDADE[u]}
                    </option>
                  ))}
                </select>
              </label>
              <CampoNumero rotulo="Paguei" prefixo="R$" valor={i.precoCompra} aoMudar={(v) => atualizar(i.id, { precoCompra: v })} />
              <CampoNumero rotulo="Na compra veio" sufixo={i.unidade} valor={i.qtdCompra} aoMudar={(v) => atualizar(i.id, { qtdCompra: v })} />
              <div className="pb-2">
                <div className="text-sm font-semibold text-stone-600">Custo</div>
                <div className="font-extrabold">
                  {brl(custoUnitarioInsumo(i))}/{i.unidade}
                </div>
              </div>
              <button
                className="pb-2 text-2xl text-stone-400 hover:text-red-600"
                title="Excluir"
                onClick={() => {
                  if (usos.length && !confirm(`"${i.nome}" é usado em: ${usos.join(', ')}. Excluir mesmo assim? Ele sai da ficha desses produtos.`)) return
                  if (!usos.length && !confirm(`Excluir "${i.nome}"?`)) return
                  setInsumos((is) => is.filter((x) => x.id !== i.id))
                }}
              >
                ×
              </button>
              {usos.length > 0 && <p className="col-span-full text-xs text-stone-500">Usado em: {usos.join(', ')}</p>}
            </div>
          )
        })}
      </div>
      <button
        className={`${btn.primario} mt-4`}
        onClick={() => setInsumos((is) => [...is, { id: novoId(), nome: 'Novo insumo', unidade: 'kg', precoCompra: 0, qtdCompra: 1 }])}
      >
        + Adicionar insumo
      </button>
    </section>
  )
}

function Produtos({ dados }: { dados: Dados }) {
  const { produtos, setProdutos, insumos } = dados
  const [editando, setEditando] = useState<Produto | null>(null)

  const mover = (idx: number, d: number) =>
    setProdutos((ps) => {
      const n = ps.slice()
      const j = idx + d
      if (j < 0 || j >= n.length) return ps
      ;[n[idx], n[j]] = [n[j], n[idx]]
      return n
    })

  function salvar(p: Produto) {
    setProdutos((ps) => (ps.some((x) => x.id === p.id) ? ps.map((x) => (x.id === p.id ? p : x)) : [...ps, p]))
    setEditando(null)
  }

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-stone-600">A ordem aqui é a ordem dos botões na tela de venda.</p>
        <button
          className={btn.primario}
          onClick={() =>
            setEditando({ id: novoId(), nome: '', categoria: 'espeto', preco: 0, emoji: '🍢', ficha: [], custoDireto: 0, ativo: true, estoque: 0 })
          }
        >
          + Novo produto
        </button>
      </div>
      <div className="overflow-x-auto rounded-2xl border-2 border-stone-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b-2 border-stone-200 text-left text-stone-600">
              <th className="p-3">Produto</th>
              <th className="p-3 text-right">Venda</th>
              <th className="p-3 text-right">Custo</th>
              <th className="p-3 text-right">Lucro/un</th>
              <th className="p-3 text-right">Margem</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {produtos.map((p, idx) => {
              const custo = custoCompleto(p, insumos, produtos)
              const lucro = p.preco - custo
              const margem = p.preco > 0 ? (lucro / p.preco) * 100 : 0
              return (
                <tr key={p.id} className={`border-b border-stone-100 ${p.ativo ? '' : 'opacity-50'}`}>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <Imagem emoji={p.emoji} imagem={p.imagem} className="h-11 w-11 shrink-0 rounded-lg text-2xl" />
                      <div>
                        <div className="font-bold">{p.nome}</div>
                        <div className="text-xs text-stone-500">
                          {NOMES_CATEGORIA[p.categoria]}
                          {p.estoque !== undefined && ` · estoque ${p.estoque}`}
                          {p.componentes?.length ? ` · ${p.componentes.map((c) => `${c.qtd} ${c.nome.toLowerCase()}`).join(' + ')}` : ''}
                          {!p.ativo && ' · inativo'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-right font-bold">{brl(p.preco)}</td>
                  <td className="p-3 text-right">{brl(custo)}</td>
                  <td className={`p-3 text-right font-semibold ${lucro < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{brl(lucro)}</td>
                  <td className={`p-3 text-right ${margem < 30 ? 'font-bold text-red-600' : ''}`}>{pct(margem)}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <button className="rounded px-2 text-stone-500 hover:bg-stone-100" onClick={() => mover(idx, -1)} aria-label="Subir">
                        ↑
                      </button>
                      <button className="rounded px-2 text-stone-500 hover:bg-stone-100" onClick={() => mover(idx, 1)} aria-label="Descer">
                        ↓
                      </button>
                      <button className={btn.secundario + ' !py-1'} onClick={() => setEditando(p)}>
                        Editar
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {editando && (
        <EditorProduto
          inicial={editando}
          insumos={insumos}
          produtos={produtos}
          novo={!produtos.some((p) => p.id === editando.id)}
          aoFechar={() => setEditando(null)}
          aoSalvar={salvar}
          aoExcluir={() => {
            setProdutos((ps) => ps.filter((p) => p.id !== editando.id))
            setEditando(null)
          }}
        />
      )}
    </section>
  )
}

function EditorProduto({
  inicial,
  insumos,
  produtos,
  novo,
  aoFechar,
  aoSalvar,
  aoExcluir,
}: {
  inicial: Produto
  insumos: Insumo[]
  produtos: Produto[]
  novo: boolean
  aoFechar: () => void
  aoSalvar: (p: Produto) => void
  aoExcluir: () => void
}) {
  const [p, setP] = useState<Produto>(inicial)
  const [margemAlvo, setMargemAlvo] = useState(60)
  const [erroFoto, setErroFoto] = useState('')
  const set = (m: Partial<Produto>) => setP((x) => ({ ...x, ...m }))
  const custo = custoCompleto(p, insumos, produtos)
  const custoProprio = custoProduto(p, insumos)
  const opcoesCombo = produtos.filter((x) => x.id !== p.id && x.categoria !== 'combo')
  const comps = p.componentes ?? []
  const setComps = (c: NonNullable<Produto['componentes']>) => set({ componentes: c })
  const lucro = p.preco - custo
  const margem = p.preco > 0 ? (lucro / p.preco) * 100 : 0
  const sugerido = margemAlvo < 100 ? Math.ceil((custo / (1 - margemAlvo / 100)) * 2) / 2 : 0

  return (
    <Modal titulo={novo ? 'Novo produto' : `Editar ${inicial.nome}`} aberto aoFechar={aoFechar} largo>
      <div className="grid gap-4 md:grid-cols-[180px_1fr]">
        <div>
          <Imagem emoji={p.emoji} imagem={p.imagem} className="h-40 w-full rounded-2xl border-2 border-stone-200 text-7xl" />
          <label className={`${btn.secundario} mt-2 block cursor-pointer text-center text-sm`}>
            📷 {p.imagem ? 'Trocar foto' : 'Usar foto'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                try {
                  set({ imagem: await reduzirImagem(f) })
                  setErroFoto('')
                } catch {
                  setErroFoto('Não consegui abrir essa imagem.')
                }
              }}
            />
          </label>
          {p.imagem && (
            <button className="mt-1 w-full text-sm text-red-600" onClick={() => set({ imagem: undefined })}>
              Remover foto
            </button>
          )}
          {erroFoto && <p className="text-sm text-red-600">{erroFoto}</p>}
          <div className="mt-2 flex flex-wrap gap-1">
            {EMOJIS.map((e) => (
              <button key={e} className={`rounded p-1 text-xl ${p.emoji === e ? 'bg-orange-200' : 'hover:bg-stone-100'}`} onClick={() => set({ emoji: e })}>
                {e}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <CampoTexto rotulo="Nome no botão" valor={p.nome} aoMudar={(v) => set({ nome: v })} placeholder="Ex.: Carne" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CATEGORIAS.map((c) => (
              <button
                key={c}
                onClick={() =>
                  set(
                    c === 'combo'
                      ? { categoria: c, estoque: undefined, componentes: p.componentes?.length ? p.componentes : [{ id: novoId(), nome: 'Espeto', qtd: 1, opcoes: [] }] }
                      : { categoria: c, componentes: undefined },
                  )
                }
                className={`rounded-xl px-1 py-2 text-sm font-bold ${p.categoria === c ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-700'}`}
              >
                {NOMES_CATEGORIA[c]}
              </button>
            ))}
          </div>
          <CampoNumero rotulo="Preço de venda" prefixo="R$" grande valor={p.preco} aoMudar={(v) => set({ preco: v })} />

          {p.categoria === 'combo' && (
            <div className="rounded-xl border-2 border-rose-200 bg-rose-50/40 p-3">
              <div className="font-extrabold">O que vem no combo/jantinha</div>
              <p className="text-xs text-stone-500">
                Marque as opções que o cliente pode escolher. Com uma opção só, entra direto. Os espetos escolhidos saem do estoque de espetos prontos.
              </p>
              <ul className="mt-2 space-y-3">
                {comps.map((c, idx) => (
                  <li key={c.id} className="rounded-lg bg-white p-2">
                    <div className="grid grid-cols-[1fr_6rem_auto] items-end gap-2">
                      <CampoTexto
                        rotulo="Item"
                        valor={c.nome}
                        aoMudar={(v) => setComps(comps.map((x, i) => (i === idx ? { ...x, nome: v } : x)))}
                        placeholder="Espeto, Refri…"
                      />
                      <CampoNumero rotulo="Qtd" valor={c.qtd} aoMudar={(v) => setComps(comps.map((x, i) => (i === idx ? { ...x, qtd: Math.max(1, Math.round(v)) } : x)))} />
                      <button className="pb-2 text-xl text-stone-400 hover:text-red-600" onClick={() => setComps(comps.filter((_, i) => i !== idx))}>
                        ×
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {opcoesCombo.map((o) => {
                        const marcado = c.opcoes.includes(o.id)
                        return (
                          <button
                            key={o.id}
                            onClick={() =>
                              setComps(comps.map((x, i) => (i === idx ? { ...x, opcoes: marcado ? x.opcoes.filter((y) => y !== o.id) : [...x.opcoes, o.id] } : x)))
                            }
                            className={`rounded-full px-2.5 py-1 text-sm font-semibold ${marcado ? 'bg-rose-600 text-white' : 'bg-stone-100 text-stone-700'}`}
                          >
                            {o.emoji} {o.nome}
                          </button>
                        )
                      })}
                    </div>
                    {c.opcoes.length === 0 && <p className="mt-1 text-xs font-semibold text-red-600">Marque pelo menos uma opção.</p>}
                  </li>
                ))}
              </ul>
              <button className="mt-2 text-sm font-bold text-rose-700" onClick={() => setComps([...comps, { id: novoId(), nome: 'Refri', qtd: 1, opcoes: [] }])}>
                + adicionar item ao combo
              </button>
            </div>
          )}

          <div className="rounded-xl border-2 border-stone-200 p-3">
            <div className="font-extrabold">{p.categoria === 'combo' ? 'Acompanhamentos (baião, vinagrete…) — por unidade' : 'Ficha técnica — o que vai em 1 unidade'}</div>
            <p className="text-xs text-stone-500">Ex.: 1 espeto de carne = 100 g de carne + 1 palito + 3 g de tempero.</p>
            <ul className="mt-2 space-y-2">
              {p.ficha.map((f, idx) => {
                const ins = insumos.find((i) => i.id === f.insumoId)
                return (
                  <li key={idx} className="grid grid-cols-[1fr_7rem_5rem_auto] items-center gap-2">
                    <select
                      className="min-w-0 rounded-xl border-2 border-stone-200 bg-white px-2 py-2"
                      value={f.insumoId}
                      onChange={(e) => set({ ficha: p.ficha.map((x, i) => (i === idx ? { ...x, insumoId: e.target.value } : x)) })}
                    >
                      {!ins && <option value={f.insumoId}>(insumo excluído)</option>}
                      {insumos.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.nome}
                        </option>
                      ))}
                    </select>
                    <CampoNumero
                      sufixo={ins ? unidadeFicha(ins.unidade) : ''}
                      valor={f.qtd}
                      aoMudar={(v) => set({ ficha: p.ficha.map((x, i) => (i === idx ? { ...x, qtd: v } : x)) })}
                    />
                    <span className="text-right text-sm font-semibold">{brl(custoItemFicha(f, insumos))}</span>
                    <button className="px-1 text-xl text-stone-400 hover:text-red-600" onClick={() => set({ ficha: p.ficha.filter((_, i) => i !== idx) })}>
                      ×
                    </button>
                  </li>
                )
              })}
            </ul>
            {insumos.length > 0 ? (
              <button
                className="mt-2 text-sm font-bold text-orange-700"
                onClick={() => set({ ficha: [...p.ficha, { insumoId: insumos[0].id, qtd: 0 }] })}
              >
                + adicionar insumo
              </button>
            ) : (
              <p className="mt-2 text-sm text-stone-500">Cadastre insumos na aba “Insumos”.</p>
            )}
            <CampoNumero
              className="mt-3"
              rotulo={p.categoria === 'bebida' ? 'Custo da unidade (quanto pagou na lata/garrafa)' : 'Outros custos por unidade (embalagem, guardanapo…)'}
              prefixo="R$"
              valor={p.custoDireto}
              aoMudar={(v) => set({ custoDireto: v })}
            />
          </div>

          {p.categoria === 'combo' && (
            <p className="text-xs text-stone-500">
              Custo = acompanhamentos {brl(custoProprio)} + itens do combo (pela opção mais cara: {brl(custo - custoProprio)}). Na venda é usado o custo real da escolha.
            </p>
          )}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-stone-100 p-2">
              <div className="text-xs text-stone-600">Custo</div>
              <div className="text-lg font-extrabold">{brl(custo)}</div>
            </div>
            <div className={`rounded-xl p-2 ${lucro < 0 ? 'bg-red-100' : 'bg-emerald-100'}`}>
              <div className="text-xs text-stone-600">Lucro por unidade</div>
              <div className="text-lg font-extrabold">{brl(lucro)}</div>
            </div>
            <div className="rounded-xl bg-stone-100 p-2">
              <div className="text-xs text-stone-600">Margem</div>
              <div className="text-lg font-extrabold">{pct(margem)}</div>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-2 rounded-xl bg-orange-50 p-3 text-sm">
            <CampoNumero className="w-28" rotulo="Margem desejada" sufixo="%" valor={margemAlvo} aoMudar={(v) => setMargemAlvo(Math.min(95, v))} />
            <div className="flex-1 pb-2">
              Preço sugerido: <b className="text-base">{brl(sugerido)}</b>
            </div>
            <button className={btn.secundario} onClick={() => set({ preco: arred(sugerido) })}>
              Usar
            </button>
          </div>

          <label className="flex items-center gap-2 font-semibold">
            <input type="checkbox" className="h-5 w-5 accent-orange-600" checked={p.ativo} onChange={(e) => set({ ativo: e.target.checked })} />
            Aparece na tela de venda
          </label>
          {p.categoria !== 'combo' && (
            <label className="flex items-center gap-2 font-semibold">
              <input
                type="checkbox"
                className="h-5 w-5 accent-orange-600"
                checked={p.estoque !== undefined}
                onChange={(e) => set({ estoque: e.target.checked ? (inicial.estoque ?? 0) : undefined })}
              />
              Controlar estoque (contar unidades prontas e bloquear quando acabar)
            </label>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap justify-between gap-2">
        {!novo ? (
          <button className={btn.perigo} onClick={() => confirm(`Excluir "${inicial.nome}"? As vendas antigas continuam nos relatórios.`) && aoExcluir()}>
            Excluir
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button className={btn.secundario} onClick={aoFechar}>
            Cancelar
          </button>
          <button
            className={btn.primario}
            disabled={!p.nome.trim() || (p.categoria === 'combo' && (!comps.length || comps.some((c) => !c.opcoes.length)))}
            onClick={() => aoSalvar({ ...p, nome: p.nome.trim() })}
          >
            Salvar
          </button>
        </div>
      </div>
    </Modal>
  )
}
