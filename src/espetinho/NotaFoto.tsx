import { useRef, useState } from 'react'
import type { LinhaCompra } from './Compras'
import { arred, brl, limparCodigo, novoId } from './dados'
import { casarItem, lerChaveIA, lerNotaPorFoto, nomeDoItem, prepararArquivo, salvarChaveIA, ErroLeitura, type Anexo, type ItemLido, type NotaLida } from './notaIA'
import type { Produto } from './tipos'
import { CampoNumero, CampoTexto, Modal, btn } from './ui'

export interface ResultadoNota {
  linhas: LinhaCompra[]
  novos: Produto[]
  /** O que aprendeu: código de barras e/ou nome na nota de cada produto. */
  aprendidos: { produtoId: string; nomeNota: string; codigo?: string }[]
  fornecedor: string
  nota: string
}

interface LinhaRevisao {
  item: ItemLido
  /** id do produto, 'novo' para cadastrar, '' para ignorar */
  produtoId: string
  certeza: string
  quantidade: number
  porEmb: number
  total: number
}

const emoji = (nome: string) =>
  /cerv|chopp|skol|brahma|heine|amstel|antarc|itaip|budw|stella|corona|spaten|original/i.test(nome)
    ? '🍺'
    : /vinho/i.test(nome)
      ? '🍷'
      : /gelo/i.test(nome)
        ? '🧊'
        : /carv/i.test(nome)
          ? '🔥'
          : /vodka|whisk|gin|cacha|conhaq/i.test(nome)
            ? '🍾'
            : '🥤'

export function LerNotaFoto({ revenda, aoFechar, aoUsar }: { revenda: Produto[]; aoFechar: () => void; aoUsar: (r: ResultadoNota) => void }) {
  const [chave, setChave] = useState(lerChaveIA())
  const [chaveNova, setChaveNova] = useState('')
  const [anexos, setAnexos] = useState<Anexo[]>([])
  const [etapa, setEtapa] = useState<'escolher' | 'lendo' | 'revisar'>('escolher')
  const [erro, setErro] = useState('')
  const [lida, setLida] = useState<NotaLida | null>(null)
  const [linhas, setLinhas] = useState<LinhaRevisao[]>([])
  const [fornecedor, setFornecedor] = useState('')
  const [nota, setNota] = useState('')
  const camera = useRef<HTMLInputElement>(null)
  const arquivos = useRef<HTMLInputElement>(null)
  const ordenados = [...revenda].sort((a, b) => a.nome.localeCompare(b.nome))
  const prod = (id: string) => revenda.find((p) => p.id === id)

  async function adicionar(fs: FileList | null) {
    if (!fs?.length) return
    setErro('')
    try {
      const novos = await Promise.all([...fs].map(prepararArquivo))
      setAnexos((a) => [...a, ...novos].slice(0, 8))
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não consegui abrir o arquivo.')
    }
  }

  async function ler() {
    setErro('')
    setEtapa('lendo')
    try {
      const r = await lerNotaPorFoto(anexos, chave)
      setLida(r)
      setFornecedor(r.fornecedor ?? '')
      setNota(r.numeroNota ?? '')
      setLinhas(
        r.itens.map((item) => {
          const c = casarItem(item, revenda)
          const porEmb = item.unidadesPorEmbalagem ?? (item.embalagem === 'unidade' ? 1 : (c.produto?.unidadesCaixa ?? 1))
          return { item, produtoId: c.produto?.id ?? '', certeza: c.certeza, quantidade: item.quantidade, porEmb: Math.max(1, porEmb), total: item.valorTotal }
        }),
      )
      setEtapa('revisar')
    } catch (e) {
      setErro(e instanceof ErroLeitura ? e.message : e instanceof Error ? `Erro: ${e.message}` : 'Erro ao ler a nota.')
      setEtapa('escolher')
    }
  }

  const muda = (i: number, m: Partial<LinhaRevisao>) => setLinhas((ls) => ls.map((l, j) => (j === i ? { ...l, ...m } : l)))
  const usadas = linhas.filter((l) => l.produtoId)
  const soma = arred(usadas.reduce((s, l) => s + l.total, 0))
  const somaTudo = arred(linhas.reduce((s, l) => s + l.total, 0))
  const semProduto = linhas.filter((l) => !l.produtoId).length

  function usar() {
    const novos: Produto[] = []
    const aprendidos: ResultadoNota['aprendidos'] = []
    const result: LinhaCompra[] = []
    for (const l of usadas) {
      const codigo = l.item.codigoBarras ? limparCodigo(l.item.codigoBarras) : ''
      let p = l.produtoId === 'novo' ? undefined : prod(l.produtoId)
      if (!p) {
        const nome = nomeDoItem(l.item.descricao)
        p = {
          id: novoId(),
          nome,
          categoria: 'bebida',
          preco: 0,
          emoji: emoji(nome),
          ficha: [],
          custoDireto: 0,
          ativo: true,
          estoque: 0,
          nomesNota: [l.item.descricao],
          ...(codigo.length >= 8 ? { codigos: [codigo] } : {}),
          ...(l.porEmb > 1 ? { unidadesCaixa: l.porEmb } : {}),
        }
        novos.push(p)
      } else {
        aprendidos.push({ produtoId: p.id, nomeNota: l.item.descricao, ...(codigo.length >= 8 ? { codigo } : {}) })
      }
      const caixa = l.porEmb > 1
      result.push({
        produtoId: p.id,
        porCaixa: caixa,
        caixas: caixa ? l.quantidade : 0,
        porCaixaUn: caixa ? l.porEmb : (p.unidadesCaixa ?? 12),
        unidades: arred(l.quantidade * l.porEmb),
        total: l.total,
        precoVenda: p.preco,
      })
    }
    aoUsar({ linhas: result, novos, aprendidos, fornecedor: fornecedor.trim(), nota: nota.trim() })
  }

  // ---------- sem chave ----------
  if (!chave) {
    return (
      <Modal titulo="📸 Ler nota por foto" aberto aoFechar={aoFechar}>
        <p className="text-stone-700">
          A leitura usa a inteligência artificial <b>Claude</b>, da Anthropic. Você precisa de uma <b>chave</b> (uma vez só, em cada aparelho):
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-stone-700">
          <li>
            Crie a conta em{' '}
            <a className="font-bold text-orange-700 underline" href="https://platform.claude.com" target="_blank" rel="noreferrer">
              platform.claude.com
            </a>{' '}
            e coloque alguns dólares de crédito (cada nota custa só uns centavos).
          </li>
          <li>Em “API keys”, crie uma chave e copie (começa com sk-ant-).</li>
          <li>Cole aqui embaixo. Dica: defina um limite de gasto mensal na conta.</li>
        </ol>
        <CampoTexto className="mt-3" rotulo="Chave da API" valor={chaveNova} aoMudar={setChaveNova} placeholder="sk-ant-…" />
        <p className="mt-1 text-xs text-stone-500">Fica guardada só neste aparelho — não vai para o backup, planilha nem pasta do Drive.</p>
        <button
          className={`${btn.primario} mt-3 w-full`}
          disabled={!chaveNova.trim().startsWith('sk-')}
          onClick={() => {
            salvarChaveIA(chaveNova)
            setChave(chaveNova.trim())
          }}
        >
          Salvar chave
        </button>
      </Modal>
    )
  }

  // ---------- revisão ----------
  if (etapa === 'revisar' && lida) {
    return (
      <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/60 sm:p-4">
        <div role="dialog" aria-label="Conferir a nota" className="flex w-full max-w-6xl flex-col overflow-hidden bg-white sm:rounded-2xl">
          <div className="flex items-center gap-3 border-b-2 border-stone-200 p-4">
            <h2 className="flex-1 text-xl font-extrabold">📸 Conferir o que a IA leu</h2>
            <button onClick={aoFechar} className="rounded-full p-2 text-2xl leading-none text-stone-500 hover:bg-stone-100" aria-label="Fechar">
              ×
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_12rem_10rem]">
              <CampoTexto rotulo="Fornecedor" valor={fornecedor} aoMudar={setFornecedor} />
              <CampoTexto rotulo="Nº da nota" valor={nota} aoMudar={setNota} />
              <div className="text-sm">
                <span className="mb-1 block font-semibold text-stone-600">Data</span>
                <span className="block pt-2">{lida.data ?? '—'}</span>
              </div>
            </div>
            <p className="mt-3 text-sm text-stone-600">
              Confira cada linha: o produto do sistema, a quantidade e o valor. Linhas com <b className="text-amber-700">⚠</b> a IA teve dúvida. O que você
              escolher fica aprendido para a próxima nota.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b-2 border-stone-200 text-left text-xs uppercase text-stone-500">
                    <th className="p-2">Na nota</th>
                    <th className="p-2">Produto no sistema</th>
                    <th className="p-2">Quantidade</th>
                    <th className="p-2 text-right">Total da linha</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l, i) => {
                    const p = l.produtoId && l.produtoId !== 'novo' ? prod(l.produtoId) : undefined
                    const un = l.quantidade * l.porEmb
                    return (
                      <tr key={i} className={`border-b border-stone-100 align-top ${l.produtoId ? '' : 'bg-stone-50 text-stone-400'}`}>
                        <td className="p-2">
                          <div className="font-semibold">
                            {l.item.duvida && (
                              <span className="mr-1 text-amber-700" title="A IA teve dúvida nesta linha">
                                ⚠
                              </span>
                            )}
                            {l.item.descricao}
                          </div>
                          <div className="text-xs text-stone-500">
                            {l.item.quantidade} {l.item.embalagem}
                            {l.item.unidadesPorEmbalagem ? ` c/ ${l.item.unidadesPorEmbalagem}` : ''}
                            {l.item.valorUnitario != null && ` · ${brl(l.item.valorUnitario)} cada`}
                            {l.item.codigoBarras && <span className="ml-1 font-mono">{l.item.codigoBarras}</span>}
                          </div>
                        </td>
                        <td className="p-2">
                          <select
                            className={`w-full rounded-xl border-2 px-2 py-2 ${!l.produtoId ? 'border-stone-200' : l.certeza === 'parecido' ? 'border-amber-400' : 'border-emerald-400'}`}
                            value={l.produtoId}
                            onChange={(e) => {
                              const np = prod(e.target.value)
                              muda(i, {
                                produtoId: e.target.value,
                                certeza: 'escolhido',
                                ...(l.item.unidadesPorEmbalagem == null && l.item.embalagem !== 'unidade' && np?.unidadesCaixa ? { porEmb: np.unidadesCaixa } : {}),
                              })
                            }}
                          >
                            <option value="">— não lançar esta linha —</option>
                            <option value="novo">+ Cadastrar novo: {nomeDoItem(l.item.descricao)}</option>
                            {ordenados.map((o) => (
                              <option key={o.id} value={o.id}>
                                {o.nome}
                              </option>
                            ))}
                          </select>
                          <div className="mt-1 text-xs">
                            {l.certeza === 'codigo' && <span className="text-emerald-700">✔ pelo código de barras</span>}
                            {l.certeza === 'nome-salvo' && <span className="text-emerald-700">✔ já visto em outra nota</span>}
                            {l.certeza === 'parecido' && <span className="font-semibold text-amber-700">parecido — confira</span>}
                            {l.certeza === 'nenhum' && !l.produtoId && <span className="text-red-700">não achei — escolha ou cadastre</span>}
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-1">
                            <CampoNumero className="w-20" valor={l.quantidade} aoMudar={(v) => muda(i, { quantidade: v })} />
                            <span className="text-stone-500">×</span>
                            <CampoNumero className="w-16" valor={l.porEmb} aoMudar={(v) => muda(i, { porEmb: Math.max(1, Math.round(v)) })} />
                          </div>
                          <div className="mt-1 text-xs text-stone-500">
                            {l.porEmb > 1 ? 'caixas × unidades' : 'unidades'} = <b>{arred(un)} un</b>
                            {p && un > 0 && ` · ${brl(l.total / un)}/un`}
                          </div>
                        </td>
                        <td className="p-2 text-right">
                          <CampoNumero className="ml-auto w-28" prefixo="R$" valor={l.total} aoMudar={(v) => muda(i, { total: v })} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {lida.observacao && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">📝 {lida.observacao}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t-2 border-stone-200 p-4">
            <div className="flex-1 text-sm">
              <div>
                Soma das linhas: <b className="text-lg">{brl(somaTudo)}</b>
                {lida.totalNota != null && (
                  <>
                    {' '}
                    · total na nota: <b className="text-lg">{brl(lida.totalNota)}</b>{' '}
                    {Math.abs(lida.totalNota - somaTudo) < 0.05 ? (
                      <span className="font-bold text-emerald-700">✔ bate</span>
                    ) : (
                      <span className="font-bold text-red-700">⚠ diferença de {brl(Math.abs(lida.totalNota - somaTudo))} — confira</span>
                    )}
                  </>
                )}
              </div>
              {semProduto > 0 && <div className="text-stone-500">{semProduto} linha(s) não vão ser lançadas.</div>}
            </div>
            <button className={btn.secundario} onClick={() => setEtapa('escolher')}>
              ← Outra foto
            </button>
            <button className={`${btn.verde} text-lg`} disabled={!usadas.length} onClick={usar}>
              ✔ Colocar na compra ({usadas.length} · {brl(soma)})
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ---------- escolher / lendo ----------
  return (
    <Modal titulo="📸 Ler nota por foto" aberto aoFechar={etapa === 'lendo' ? () => {} : aoFechar}>
      {etapa === 'lendo' ? (
        <div className="py-10 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600" />
          <p className="mt-4 text-lg font-bold">Lendo a nota…</p>
          <p className="text-sm text-stone-500">Pode levar até 1 minuto.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-stone-600">
            Tire a foto da nota inteira, reta e com boa luz. Nota comprida: tire várias fotos (de cima para baixo). Também aceita o PDF da nota (DANFE).
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button className={btn.primario} onClick={() => camera.current?.click()}>
              📷 Tirar foto
            </button>
            <button className={btn.secundario} onClick={() => arquivos.current?.click()}>
              🖼️ Fotos ou PDF
            </button>
          </div>
          <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => (adicionar(e.target.files), (e.target.value = ''))} />
          <input
            ref={arquivos}
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            onChange={(e) => (adicionar(e.target.files), (e.target.value = ''))}
          />
          {anexos.length > 0 && (
            <ul className="mt-3 grid grid-cols-4 gap-2">
              {anexos.map((a, i) => (
                <li key={i} className="relative">
                  {a.previa ? (
                    <img src={a.previa} alt={a.nome} className="h-24 w-full rounded-lg object-cover ring-1 ring-stone-200" />
                  ) : (
                    <div className="flex h-24 items-center justify-center rounded-lg bg-stone-100 text-3xl">📄</div>
                  )}
                  <button
                    className="absolute right-1 top-1 rounded-full bg-black/60 px-2 text-white"
                    onClick={() => setAnexos((x) => x.filter((_, j) => j !== i))}
                    aria-label="Tirar"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          {erro && <p className="mt-3 rounded-xl bg-red-50 p-3 font-semibold text-red-700">{erro}</p>}
          <button className={`${btn.verde} mt-4 w-full text-lg`} disabled={!anexos.length} onClick={ler}>
            🤖 Ler nota {anexos.length > 1 ? `(${anexos.length} fotos)` : ''}
          </button>
          <p className="mt-2 text-center text-xs text-stone-500">Nada é lançado sem você conferir. Cada leitura custa alguns centavos na sua conta da Anthropic.</p>
        </>
      )}
    </Modal>
  )
}
