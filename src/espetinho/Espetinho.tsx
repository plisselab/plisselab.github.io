import { useEffect, useState } from 'react'
import Cadastros from './Cadastros'
import CaixaTela from './Caixa'
import ConfigTela from './Config'
import { brl, resumirCaixa, useEspetoDados } from './dados'
import Estoque from './Estoque'
import Comandas from './Comandas'
import { statusComanda } from './comanda'
import Painel from './Painel'
import { usePasta } from './pasta'
import { usePlanilha } from './planilha'
import Relatorios from './Relatorios'
import Venda from './Venda'

type Aba = 'venda' | 'comandas' | 'painel' | 'estoque' | 'caixa' | 'relatorios' | 'cadastros' | 'config'

const ABAS: { id: Aba; nome: string; icone: string }[] = [
  { id: 'venda', nome: 'Vender', icone: '🛒' },
  { id: 'comandas', nome: 'Comandas', icone: '📝' },
  { id: 'painel', nome: 'Painel', icone: '📊' },
  { id: 'estoque', nome: 'Estoque', icone: '📦' },
  { id: 'caixa', nome: 'Caixa', icone: '💰' },
  { id: 'relatorios', nome: 'Relatórios', icone: '📈' },
  { id: 'cadastros', nome: 'Cadastros', icone: '🍢' },
  { id: 'config', nome: 'Config.', icone: '⚙️' },
]

/** PDV de espetinho: vendas, custo por ficha técnica, estoque do dia, caixa e relatórios. Dados no localStorage. */
export default function Espetinho() {
  const dados = useEspetoDados()
  const planilha = usePlanilha(dados)
  const pasta = usePasta(dados)
  const [carregando, setCarregando] = useState(false)
  const [aba, setAba] = useState<Aba>('venda')

  useEffect(() => {
    const titulo = document.title
    document.title = `PDV — ${dados.config.nomeLoja}`
    document.documentElement.classList.remove('dark')
    return () => {
      document.title = titulo
    }
  }, [dados.config.nomeLoja])

  const comandasAbertas = dados.comandas.filter((c) => statusComanda(c, dados.pedidos) === 'aberta').length
  const r = dados.caixaAberto ? resumirCaixa(dados.caixaAberto, dados.pedidos, dados.produtos, dados.movEstoque) : null

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <header className="sticky top-0 z-20 bg-stone-900 text-white shadow">
        <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-3 py-2">
          <div className="mr-2 hidden shrink-0 items-center gap-2 sm:flex">
            <span className="text-2xl">🔥</span>
            <span className="max-w-[12rem] truncate font-extrabold">{dados.config.nomeLoja}</span>
          </div>
          <nav className="flex flex-1 gap-1 overflow-x-auto">
            {ABAS.map((a) => (
              <button
                key={a.id}
                onClick={() => setAba(a.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 font-bold ${aba === a.id ? 'bg-orange-600 text-white' : 'text-stone-300 hover:bg-white/10'}`}
              >
                <span>{a.icone}</span>
                <span>{a.nome}</span>
                {a.id === 'comandas' && comandasAbertas > 0 && (
                  <span className="rounded-full bg-white px-1.5 text-xs font-black text-orange-700">{comandasAbertas}</span>
                )}
              </button>
            ))}
          </nav>
          {pasta.estado.tipo !== 'nenhuma' && (
            <button
              onClick={() => (pasta.estado.tipo === 'precisaPermissao' ? void pasta.reautorizar() : setAba('config'))}
              title={pasta.estado.tipo === 'erro' ? pasta.estado.msg : `Salvando na pasta ${pasta.estado.nome}`}
              className={`shrink-0 rounded-lg px-2 py-1 text-xs font-bold ${
                pasta.estado.tipo === 'erro' || pasta.estado.tipo === 'precisaPermissao'
                  ? 'bg-red-600 text-white'
                  : pasta.estado.tipo === 'ok'
                    ? 'text-emerald-400'
                    : 'text-amber-300'
              }`}
            >
              {pasta.estado.tipo === 'ok'
                ? '📁 salvo'
                : pasta.estado.tipo === 'precisaPermissao'
                  ? '📁 clique p/ salvar'
                  : pasta.estado.tipo === 'erro'
                    ? '⚠ pasta'
                    : '📁 salvando…'}
            </button>
          )}
          {planilha.ligado && (
            <button
              onClick={() => setAba('config')}
              title={planilha.estado.tipo === 'erro' ? planilha.estado.msg : 'Sincronização com o Google Planilhas'}
              className={`shrink-0 rounded-lg px-2 py-1 text-xs font-bold ${
                planilha.estado.tipo === 'erro' ? 'bg-red-600 text-white' : planilha.estado.tipo === 'ok' ? 'text-emerald-400' : 'text-amber-300'
              }`}
            >
              {planilha.estado.tipo === 'erro'
                ? '⚠ planilha'
                : planilha.estado.tipo === 'ok'
                  ? '☁ salvo'
                  : planilha.estado.tipo === 'enviando'
                    ? '☁ salvando…'
                    : '☁ …'}
            </button>
          )}
          <div className="hidden shrink-0 text-right text-xs md:block">
            {r ? (
              <>
                <div className="font-bold text-emerald-400">● Caixa {dados.caixaAberto!.numero} aberto</div>
                <div className="text-stone-300">
                  {r.qtdPedidos} pedidos · {brl(r.faturamento)}
                </div>
              </>
            ) : (
              <div className="font-bold text-red-400">● Caixa fechado</div>
            )}
          </div>
        </div>
      </header>
      {pasta.estado.tipo === 'precisaPermissao' && (
        <div className="bg-amber-500 text-stone-950">
          <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3 px-3 py-2">
            <span className="flex-1 font-semibold">📁 O Chrome pede para confirmar: continuar salvando as vendas na pasta “{pasta.estado.nome}”?</span>
            <button className="rounded-lg bg-stone-900 px-4 py-1.5 font-bold text-white" onClick={() => void pasta.reautorizar()}>
              Sim, continuar salvando
            </button>
          </div>
        </div>
      )}
      {planilha.remotoMaisNovo && (
        <div className="bg-sky-600 text-white">
          <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3 px-3 py-2">
            <span className="flex-1 font-semibold">
              A planilha tem dados mais novos, salvos em {new Date(planilha.remotoMaisNovo.atualizadoEm).toLocaleString('pt-BR')} por outro aparelho.
            </span>
            <button
              className="rounded-lg bg-white px-3 py-1.5 font-bold text-sky-800 disabled:opacity-60"
              disabled={carregando}
              onClick={async () => {
                setCarregando(true)
                try {
                  await planilha.carregar()
                } catch (e) {
                  alert(e instanceof Error ? e.message : String(e))
                } finally {
                  setCarregando(false)
                }
              }}
            >
              {carregando ? 'Carregando…' : 'Usar os dados da planilha'}
            </button>
            <button
              className="rounded-lg px-3 py-1.5 font-semibold text-white underline"
              onClick={() => confirm('Manter os dados DESTE aparelho e sobrescrever a planilha?') && planilha.ignorarRemoto()}
            >
              Manter os deste aparelho
            </button>
          </div>
        </div>
      )}
      <main className="mx-auto max-w-[1500px] p-3 sm:p-4">
        {aba === 'venda' && <Venda dados={dados} irPara={setAba} />}
        {aba === 'comandas' && <Comandas dados={dados} irPara={setAba} />}
        {aba === 'painel' && <Painel dados={dados} irPara={setAba} />}
        {aba === 'estoque' && <Estoque dados={dados} />}
        {aba === 'caixa' && <CaixaTela dados={dados} irPara={setAba} />}
        {aba === 'relatorios' && <Relatorios dados={dados} />}
        {aba === 'cadastros' && <Cadastros dados={dados} />}
        {aba === 'config' && <ConfigTela dados={dados} planilha={planilha} pasta={pasta} />}
      </main>
    </div>
  )
}
