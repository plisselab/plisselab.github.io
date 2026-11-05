import { useRef, useState } from 'react'
import { codigoAppsScript } from './appsScript'
import { novoId, type Dados } from './dados'
import { urlValida, type Planilha } from './planilha'
import { imprimirTeste } from './impressao'
import type { Config } from './tipos'
import { CampoNumero, CampoTexto, btn } from './ui'

export default function ConfigTela({ dados, planilha }: { dados: Dados; planilha: Planilha }) {
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

      <SecaoPlanilha dados={dados} planilha={planilha} />

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

function SecaoPlanilha({ dados, planilha }: { dados: Dados; planilha: Planilha }) {
  const { config, setConfig } = dados
  const set = (m: Partial<Config>) => setConfig((c) => ({ ...c, ...m }))
  const [copiado, setCopiado] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const chave = config.planilhaChave
  const est = planilha.estado

  async function copiar() {
    let k = chave
    if (!k) {
      k = novoId().replace(/-/g, '')
      set({ planilhaChave: k })
    }
    try {
      await navigator.clipboard.writeText(codigoAppsScript(k))
      setCopiado(true)
      setTimeout(() => setCopiado(false), 3000)
    } catch {
      alert('Não consegui copiar sozinho. Abra “ver o código” e copie à mão.')
    }
  }

  async function rodar(f: () => Promise<void>) {
    setOcupado(true)
    try {
      await f()
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <section className="rounded-2xl border-2 border-emerald-200 bg-white p-4">
      <h2 className="text-lg font-extrabold">☁ Google Planilhas</h2>
      <p className="text-sm text-stone-600">
        Guarda uma cópia de tudo numa planilha sua (Caixas, Pedidos, Itens vendidos, Estoque, Despesas), atualizada sozinha a cada venda. Serve para
        acompanhar pelo celular e para recuperar os dados em outro computador. O sistema continua funcionando se a internet cair — envia quando voltar.
      </p>

      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
        <li>
          Crie uma planilha nova em <b>sheets.google.com</b> (ex.: “PDV Espetinho”).
        </li>
        <li>
          Na planilha: <b>Extensões → Apps Script</b>. Apague o que estiver lá e cole o código:{' '}
          <button className={btn.secundario + ' !px-3 !py-1 text-sm'} onClick={copiar}>
            {copiado ? '✔ Copiado!' : '📋 Copiar código'}
          </button>
          {chave && (
            <details className="mt-1">
              <summary className="cursor-pointer text-xs text-stone-500">ver o código</summary>
              <textarea readOnly className="mt-1 h-40 w-full rounded-lg border-2 border-stone-200 p-2 font-mono text-xs" value={codigoAppsScript(chave)} />
            </details>
          )}
        </li>
        <li>
          Clique em <b>Salvar</b> (💾) e depois <b>Implantar → Nova implantação</b> → engrenagem → <b>App da Web</b>. Em “Executar como” deixe{' '}
          <b>Eu</b> e em “Quem pode acessar” escolha <b>Qualquer pessoa</b>. Clique em Implantar e autorize com sua conta Google (se aparecer “app não
          verificado”, clique em Avançado → Acessar).
        </li>
        <li>Copie o “URL do app da Web” (termina em /exec) e cole aqui:</li>
      </ol>
      <input
        className="mt-2 w-full rounded-xl border-2 border-stone-200 px-3 py-2 font-mono text-sm outline-none focus:border-emerald-500"
        placeholder="https://script.google.com/macros/s/.../exec"
        value={config.planilhaUrl}
        onChange={(e) => set({ planilhaUrl: e.target.value.trim() })}
      />
      {config.planilhaUrl && !urlValida(config.planilhaUrl) && <p className="mt-1 text-sm font-semibold text-red-600">Esse não parece o endereço do app da Web.</p>}
      {config.planilhaUrl && !chave && (
        <div className="mt-2 rounded-xl bg-amber-50 p-3 text-sm">
          <p className="font-semibold text-amber-900">
            Planilha nova? Clique em “Copiar código” (passo 2) para gerar a chave. Já ligou a planilha em outro computador? Cole a chave de lá:
          </p>
          <input
            className="mt-2 w-full rounded-lg border-2 border-stone-200 px-2 py-1 font-mono"
            placeholder="chave da planilha"
            onBlur={(e) => e.target.value.trim() && set({ planilhaChave: e.target.value.trim() })}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          />
        </div>
      )}

      {planilha.ligado && (
        <div className="mt-3 space-y-3">
          <div
            className={`rounded-xl p-3 text-sm font-semibold ${est.tipo === 'erro' ? 'bg-red-50 text-red-800' : est.tipo === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}
          >
            {est.tipo === 'erro'
              ? `Erro: ${est.msg}`
              : est.tipo === 'ok'
                ? est.em
                  ? `Conectado. Última gravação na planilha: ${new Date(est.em).toLocaleString('pt-BR')}`
                  : 'Conectado. A planilha ainda está vazia — clique em “Enviar agora”.'
                : est.tipo === 'enviando'
                  ? 'Enviando…'
                  : 'Mudanças esperando para enviar…'}
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" className="h-5 w-5 accent-emerald-600" checked={config.planilhaAuto} onChange={(e) => set({ planilhaAuto: e.target.checked })} />
            Enviar sozinho a cada mudança
          </label>
          <div className="flex flex-wrap gap-2">
            <button className={btn.verde + ' !py-2'} disabled={ocupado} onClick={() => rodar(planilha.enviar)}>
              ⬆ Enviar agora
            </button>
            <button
              className={btn.secundario}
              disabled={ocupado}
              onClick={() =>
                confirm('Trocar TODOS os dados deste aparelho pelos que estão na planilha?') &&
                rodar(async () => {
                  await planilha.carregar()
                  alert('Dados carregados da planilha.')
                })
              }
            >
              ⬇ Carregar da planilha
            </button>
          </div>
          <p className="text-xs text-stone-500">
            Use “Carregar da planilha” para levar os dados para outro computador: configure o mesmo endereço e a mesma chave lá. Use um aparelho de cada
            vez para vender — se dois venderem ao mesmo tempo, o último a salvar vence.
          </p>
          <details className="text-xs text-stone-500">
            <summary className="cursor-pointer">Chave da planilha</summary>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <code className="rounded bg-stone-100 px-2 py-1">{chave}</code>
              <span>Em outro computador, cole o mesmo endereço e esta chave:</span>
              <input
                className="rounded border-2 border-stone-200 px-2 py-1 font-mono"
                value={chave}
                onChange={(e) => set({ planilhaChave: e.target.value.trim() })}
              />
            </div>
          </details>
        </div>
      )}
    </section>
  )
}
