import { useEffect, useState } from 'react'
import Cadastros from './Cadastros'
import CaixaTela from './Caixa'
import ConfigTela from './Config'
import { brl, resumirCaixa, useEspetoDados } from './dados'
import Estoque from './Estoque'
import Painel from './Painel'
import Relatorios from './Relatorios'
import Venda from './Venda'

type Aba = 'venda' | 'painel' | 'estoque' | 'caixa' | 'relatorios' | 'cadastros' | 'config'

const ABAS: { id: Aba; nome: string; icone: string }[] = [
  { id: 'venda', nome: 'Vender', icone: '🛒' },
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
  const [aba, setAba] = useState<Aba>('venda')

  useEffect(() => {
    const titulo = document.title
    document.title = `PDV — ${dados.config.nomeLoja}`
    document.documentElement.classList.remove('dark')
    return () => {
      document.title = titulo
    }
  }, [dados.config.nomeLoja])

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
              </button>
            ))}
          </nav>
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
      <main className="mx-auto max-w-[1500px] p-3 sm:p-4">
        {aba === 'venda' && <Venda dados={dados} irPara={setAba} />}
        {aba === 'painel' && <Painel dados={dados} irPara={setAba} />}
        {aba === 'estoque' && <Estoque dados={dados} />}
        {aba === 'caixa' && <CaixaTela dados={dados} irPara={setAba} />}
        {aba === 'relatorios' && <Relatorios dados={dados} />}
        {aba === 'cadastros' && <Cadastros dados={dados} />}
        {aba === 'config' && <ConfigTela dados={dados} />}
      </main>
    </div>
  )
}
