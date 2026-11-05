import { useRef, useState } from 'react'
import { type Dados } from './dados'
import { imprimirTeste } from './impressao'
import type { Config } from './tipos'
import { CampoNumero, CampoTexto, btn } from './ui'

export default function ConfigTela({ dados }: { dados: Dados }) {
  const { config, setConfig } = dados
  const set = (m: Partial<Config>) => setConfig((c) => ({ ...c, ...m }))
  const [novaObs, setNovaObs] = useState('')
  const arquivo = useRef<HTMLInputElement>(null)

  function exportar() {
    const backup = {
      versao: 1,
      geradoEm: new Date().toISOString(),
      insumos: dados.insumos,
      produtos: dados.produtos,
      pedidos: dados.pedidos,
      caixas: dados.caixas,
      config: dados.config,
    }
    const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `backup-espetinho-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  async function importar(f: File) {
    try {
      const b = JSON.parse(await f.text())
      if (!Array.isArray(b.produtos) || !Array.isArray(b.pedidos) || !Array.isArray(b.caixas)) throw new Error()
      if (!confirm('Isso substitui TODOS os dados deste aparelho pelos do backup. Continuar?')) return
      dados.setInsumos(b.insumos ?? [])
      dados.setProdutos(b.produtos)
      dados.setPedidos(b.pedidos)
      dados.setCaixas(b.caixas)
      if (b.config) dados.setConfig(b.config)
      alert('Backup restaurado!')
    } catch {
      alert('Arquivo de backup inválido.')
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="rounded-2xl border-2 border-stone-200 bg-white p-4">
        <h2 className="text-lg font-extrabold">Dados do cupom</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <CampoTexto rotulo="Nome do estabelecimento" valor={config.nomeLoja} aoMudar={(v) => set({ nomeLoja: v })} />
          <CampoTexto rotulo="Telefone / WhatsApp" valor={config.telefone} aoMudar={(v) => set({ telefone: v })} />
          <CampoTexto className="sm:col-span-2" rotulo="Endereço" valor={config.endereco} aoMudar={(v) => set({ endereco: v })} />
          <CampoTexto className="sm:col-span-2" rotulo="Mensagem no rodapé" valor={config.rodape} aoMudar={(v) => set({ rodape: v })} />
        </div>
      </section>

      <section className="rounded-2xl border-2 border-stone-200 bg-white p-4">
        <h2 className="text-lg font-extrabold">Impressora térmica</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="font-semibold">Largura do papel:</span>
          {([58, 80] as const).map((l) => (
            <button
              key={l}
              onClick={() => set({ larguraPapel: l })}
              className={`rounded-xl px-4 py-2 font-bold ${config.larguraPapel === l ? 'bg-stone-900 text-white' : 'bg-stone-100'}`}
            >
              {l} mm
            </button>
          ))}
          <button className={btn.secundario} onClick={() => imprimirTeste(config)}>
            🖨️ Imprimir teste
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {(
            [
              ['imprimirAoFinalizar', 'Imprimir automaticamente ao finalizar o pedido'],
              ['viaChurrasqueira', 'Imprimir via da churrasqueira (letra grande, sem preços)'],
              ['viaCliente', 'Imprimir via do cliente (com preços e troco)'],
            ] as const
          ).map(([k, rotulo]) => (
            <label key={k} className="flex items-center gap-2 font-semibold">
              <input type="checkbox" className="h-5 w-5 accent-orange-600" checked={config[k]} onChange={(e) => set({ [k]: e.target.checked })} />
              {rotulo}
            </label>
          ))}
        </div>
        <details className="mt-4 rounded-xl bg-orange-50 p-3 text-sm">
          <summary className="cursor-pointer font-bold">Como configurar a Waytech para imprimir sem perguntar</summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Instale o driver da Waytech no Windows e deixe ela como <b>impressora padrão</b>.</li>
            <li>
              Nas preferências da impressora (Painel de Controle → Impressoras → Waytech → Preferências de impressão → Avançado/Configurações do papel), escolha
              o papel <b>80 mm</b> e deixe o <b>corte automático “ao fim de cada página”</b> (às vezes aparece como “Cut per page” / “Corte por página”). O sistema
              manda cada via como uma página do tamanho exato do conteúdo — a via da churrasqueira sai cortada separada da via do cliente.
            </li>
            <li>
              Na primeira impressão pelo Chrome: destino <b>Waytech</b>, margens <b>Nenhuma</b>, escala <b>100%</b>, e desmarque “Cabeçalhos e rodapés”. O
              Chrome lembra.
            </li>
            <li>
              Para não aparecer a janela de impressão: crie um atalho do Chrome com <code className="rounded bg-white px-1">--kiosk-printing</code> no final do
              campo “Destino” e abra o sistema por ele. Aí cada pedido sai direto na impressora.
            </li>
          </ol>
        </details>
      </section>

      <section className="rounded-2xl border-2 border-stone-200 bg-white p-4">
        <h2 className="text-lg font-extrabold">Embalagem para viagem</h2>
        <p className="text-sm text-stone-600">
          Entra sozinha em todo pedido marcado “Para viagem” (dá para ajustar no pedido com + e −). O custo sai do lucro e, se o insumo tiver estoque
          controlado, baixa do estoque.
        </p>
        <ul className="mt-3 space-y-2">
          {config.regrasViagem.map((r, idx) => {
            const mudar = (m: Partial<(typeof config.regrasViagem)[number]>) =>
              set({ regrasViagem: config.regrasViagem.map((x, i) => (i === idx ? { ...x, ...m } : x)) })
            return (
              <li key={idx} className="grid grid-cols-2 items-end gap-2 rounded-xl border-2 border-stone-100 p-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
                <label className="col-span-2 block sm:col-span-1">
                  <span className="mb-1 block text-sm font-semibold text-stone-600">Insumo</span>
                  <select
                    className="w-full rounded-xl border-2 border-stone-200 bg-white px-2 py-2"
                    value={r.insumoId}
                    onChange={(e) => mudar({ insumoId: e.target.value })}
                  >
                    {!dados.insumos.some((i) => i.id === r.insumoId) && <option value={r.insumoId}>(insumo excluído)</option>}
                    {dados.insumos.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.nome}
                      </option>
                    ))}
                  </select>
                </label>
                <CampoNumero rotulo="Por pedido" valor={r.porPedido} aoMudar={(v) => mudar({ porPedido: Math.round(v) })} />
                <CampoNumero rotulo="+1 a cada N espetos" valor={r.aCadaEspetos} aoMudar={(v) => mudar({ aCadaEspetos: Math.round(v) })} />
                <button
                  className="pb-2 text-2xl text-stone-400 hover:text-red-600"
                  onClick={() => set({ regrasViagem: config.regrasViagem.filter((_, i) => i !== idx) })}
                  aria-label="Remover"
                >
                  ×
                </button>
              </li>
            )
          })}
        </ul>
        <p className="mt-2 text-xs text-stone-500">
          Ex.: 1 por pedido e +1 a cada 10 espetos → até 10 espetos = 1 saquinho; 11 a 20 = 2 saquinhos. Use 0 em “a cada N” para não aumentar.
        </p>
        {dados.insumos.length > 0 && (
          <button
            className={btn.secundario + ' mt-2'}
            onClick={() =>
              set({
                regrasViagem: [
                  ...config.regrasViagem,
                  { insumoId: (dados.insumos.find((i) => i.grupo === 'Embalagens') ?? dados.insumos[0]).id, porPedido: 1, aCadaEspetos: 0 },
                ],
              })
            }
          >
            + Adicionar embalagem
          </button>
        )}
      </section>

      <section className="rounded-2xl border-2 border-stone-200 bg-white p-4">
        <h2 className="text-lg font-extrabold">Taxas da maquininha</h2>
        <p className="text-sm text-stone-600">Descontadas do valor “em conta” e do lucro.</p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <CampoNumero rotulo="Débito" sufixo="%" valor={config.taxaDebito} aoMudar={(v) => set({ taxaDebito: v })} />
          <CampoNumero rotulo="Crédito" sufixo="%" valor={config.taxaCredito} aoMudar={(v) => set({ taxaCredito: v })} />
          <CampoNumero rotulo="Pix" sufixo="%" valor={config.taxaPix} aoMudar={(v) => set({ taxaPix: v })} />
        </div>
      </section>

      <section className="rounded-2xl border-2 border-stone-200 bg-white p-4">
        <h2 className="text-lg font-extrabold">Observações rápidas</h2>
        <p className="text-sm text-stone-600">Botões que aparecem ao tocar em “+ observação” num item do pedido.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {config.obsRapidas.map((o) => (
            <span key={o} className="flex items-center gap-1 rounded-full bg-stone-100 py-1 pl-3 pr-1 font-semibold">
              {o}
              <button className="rounded-full px-2 text-stone-500 hover:text-red-600" onClick={() => set({ obsRapidas: config.obsRapidas.filter((x) => x !== o) })}>
                ×
              </button>
            </span>
          ))}
        </div>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const v = novaObs.trim()
            if (v && !config.obsRapidas.includes(v)) set({ obsRapidas: [...config.obsRapidas, v] })
            setNovaObs('')
          }}
        >
          <CampoTexto className="flex-1" valor={novaObs} aoMudar={setNovaObs} placeholder="Ex.: Sem cebola" />
          <button className={btn.secundario}>Adicionar</button>
        </form>
        <CampoNumero
          className="mt-4 w-64"
          rotulo="Avisar estoque baixo quando restar"
          sufixo="un"
          valor={config.alertaEstoque}
          aoMudar={(v) => set({ alertaEstoque: Math.round(v) })}
        />
      </section>

      <section className="rounded-2xl border-2 border-stone-200 bg-white p-4">
        <h2 className="text-lg font-extrabold">Backup</h2>
        <p className="text-sm text-stone-600">
          Os dados ficam salvos <b>neste navegador, neste aparelho</b>. Faça backup toda semana (ou ao trocar de computador) e guarde o arquivo no
          WhatsApp/Drive.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className={btn.primario} onClick={exportar}>
            ⬇️ Baixar backup
          </button>
          <button className={btn.secundario} onClick={() => arquivo.current?.click()}>
            ⬆️ Restaurar backup
          </button>
          <input
            ref={arquivo}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) importar(f)
              e.target.value = ''
            }}
          />
        </div>
      </section>
    </div>
  )
}
