import { useEffect, useMemo, useState } from 'react'
import { AVISO_18, adicionarCardapioCompleto, gerarImagensCardapio, imprimirImagens, montarCardapio, textoCardapio, type ModoCardapio } from './catalogo'
import { brl, type Dados } from './dados'
import { CampoTexto, btn } from './ui'

/** Cardápio pronto: imagem para enviar ao iFood/99Food, para imprimir na parede ou mandar no WhatsApp. */
export default function Cardapio({ dados }: { dados: Dados }) {
  const { produtos, config } = dados
  const [modo, setModo] = useState<ModoCardapio>('delivery')
  const [fora, setFora] = useState<string[]>(config.espetoHoje ? [] : ['Espetos', 'Combos e jantinhas'])
  const [titulo, setTitulo] = useState('Cardápio')
  const [comEmoji, setComEmoji] = useState(false)
  const [imagens, setImagens] = useState<string[]>([])
  const [copiado, setCopiado] = useState(false)

  const todas = useMemo(() => montarCardapio(produtos, config, modo, []), [produtos, config, modo])
  const secoes = useMemo(() => todas.filter((s) => !fora.includes(s.nome)), [todas, fora])
  const totalItens = secoes.reduce((s, x) => s + x.itens.length, 0)
  const semDetalhe = secoes.reduce((s, x) => s + x.itens.filter((i) => !i.detalhe).length, 0)

  useEffect(() => {
    const t = setTimeout(() => setImagens(secoes.length ? gerarImagensCardapio(secoes, config, titulo, comEmoji) : []), 150)
    return () => clearTimeout(t)
  }, [secoes, config, titulo, comEmoji])

  function baixar() {
    imagens.forEach((src, i) => {
      const a = document.createElement('a')
      a.href = src
      a.download = imagens.length > 1 ? `cardapio-${i + 1}.png` : 'cardapio.png'
      document.body.appendChild(a)
      a.click()
      a.remove()
    })
  }

  async function copiar() {
    const txt = textoCardapio(secoes, config, titulo)
    try {
      await navigator.clipboard.writeText(txt)
    } catch {
      prompt('Copie o cardápio:', txt)
    }
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">📋 Cardápio</h1>
          <p className="text-stone-600">Gerado dos seus produtos: imagem para o iFood/99Food, para imprimir ou mandar no WhatsApp.</p>
        </div>
        <button
          className={btn.secundario}
          onClick={() => {
            if (!confirm('Adicionar o cardápio completo de adega? (cervejas: latinha 269, lata 350, latão 473, barrigudinha 300, long neck, 600 ml e litrão; fardos, doses, destilados, refrigerantes, energéticos, gelo, carvão e petiscos)\n\nNão duplica o que você já tem e não muda seus preços. Os preços novos são uma base — ajuste para a sua região.')) return
            const n = adicionarCardapioCompleto(dados)
            alert(`Pronto! Catálogo com ${n} itens conferido. Ajuste preços e custos em Cadastros e desative o que você não vende.`)
          }}
        >
          🍻 Adicionar cardápio completo de adega
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
        <div className="space-y-4">
          <section className="rounded-2xl border-2 border-stone-200 bg-white p-4">
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1 font-bold">
              {(['delivery', 'balcao'] as ModoCardapio[]).map((m) => (
                <button key={m} onClick={() => setModo(m)} className={`rounded-lg py-2 ${modo === m ? 'bg-white shadow' : 'text-stone-500'}`}>
                  {m === 'delivery' ? '🛵 iFood / 99Food' : '🏪 Balcão'}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-stone-500">
              {modo === 'delivery'
                ? `Preços do app: preço do balcão + ${config.acrescimoDelivery}% (ou o preço próprio do produto). Muda em Configurações.`
                : 'Preços de balcão (os mesmos da tela de venda).'}
            </p>
            <CampoTexto className="mt-3" rotulo="Título" valor={titulo} aoMudar={setTitulo} placeholder="Cardápio" />
            <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={comEmoji} onChange={(e) => setComEmoji(e.target.checked)} />
              Mostrar emojis nos itens
            </label>
          </section>

          <section className="rounded-2xl border-2 border-stone-200 bg-white p-4">
            <h2 className="font-extrabold">Seções</h2>
            <ul className="mt-2 space-y-1">
              {todas.map((s) => (
                <li key={s.nome}>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!fora.includes(s.nome)}
                      onChange={(e) => setFora((f) => (e.target.checked ? f.filter((x) => x !== s.nome) : [...f, s.nome]))}
                    />
                    <span className="flex-1 font-semibold">{s.nome}</span>
                    <span className="text-sm text-stone-500">{s.itens.length}</span>
                  </label>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-stone-500">
              Para tirar um produto só do delivery, ou mudar a seção, descrição e tamanho: Cadastros → produto → “📋 Cardápio e delivery”.
            </p>
          </section>

          <section className="space-y-2 rounded-2xl border-2 border-stone-200 bg-white p-4">
            <button className={`${btn.primario} w-full`} disabled={!imagens.length} onClick={baixar}>
              ⬇️ Baixar imagem{imagens.length > 1 ? `ns (${imagens.length})` : ''}
            </button>
            <button className={`${btn.secundario} w-full`} disabled={!imagens.length} onClick={() => imprimirImagens(imagens, titulo)}>
              🖨️ Imprimir / salvar PDF
            </button>
            <button className={`${btn.secundario} w-full`} disabled={!secoes.length} onClick={copiar}>
              {copiado ? '✔ Copiado!' : '💬 Copiar texto (WhatsApp)'}
            </button>
            <p className="text-sm text-stone-600">
              {totalItens} itens em {secoes.length} seções.
              {semDetalhe > 0 && <span className="font-semibold text-amber-700"> {semDetalhe} sem tamanho/descrição — o iFood pede ml/litros e marca.</span>}
            </p>
          </section>

          <section className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <h2 className="font-extrabold">Como mandar para o iFood</h2>
            <ol className="mt-1 list-decimal space-y-1 pl-5">
              <li>No modo 🛵, baixe a imagem do cardápio.</li>
              <li>No Portal do Parceiro, em “Escolha as imagens do cardápio”, envie a(s) imagem(ns) — é o cardápio inteiro, não fotos de produto.</li>
              <li>Confira o que a inteligência do iFood leu e cadastre as fotos dos produtos depois.</li>
              <li>Marque as bebidas alcoólicas como +18 no iFood. {AVISO_18}</li>
            </ol>
            <p className="mt-2">
              No 99Food o cardápio é cadastrado pelo app/portal deles — use a imagem ou o texto como base. Pedidos que chegarem pelos apps: lance na venda com o botão
              🛵 iFood/99Food para baixar o estoque e descontar a comissão do lucro.
            </p>
          </section>
        </div>

        <section className="min-w-0 rounded-2xl border-2 border-stone-200 bg-stone-100 p-3">
          {!secoes.length ? (
            <p className="p-8 text-center text-stone-500">Nenhum produto ativo com preço nas seções escolhidas.</p>
          ) : (
            <div className="space-y-3">
              {imagens.map((src, i) => (
                <img key={i} src={src} alt={`Cardápio página ${i + 1}`} className="mx-auto w-full max-w-xl rounded-lg shadow" />
              ))}
              <details className="mx-auto max-w-xl rounded-lg bg-white p-3 text-sm">
                <summary className="cursor-pointer font-semibold">Ver em lista</summary>
                {secoes.map((s) => (
                  <div key={s.nome} className="mt-2">
                    <b>{s.nome}</b>
                    {s.itens.map((it) => (
                      <div key={it.nome} className="flex justify-between gap-2 border-b border-stone-100">
                        <span>
                          {it.nome} <span className="text-stone-500">{it.detalhe}</span>
                        </span>
                        <span className="font-semibold">{brl(it.preco)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </details>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
