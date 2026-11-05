import { useEffect } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import type { Caixa, Categoria, Config, EmbalagemPedido, Escolha, FormaPagamento, Insumo, ItemFicha, ItemPedido, MovEstoque, Pedido, Produto, Unidade } from './tipos'

export const novoId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

// ---------- formatação ----------

const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const brl = (v: number) => fmtBRL.format(Number.isFinite(v) ? v : 0)
export const pct = (v: number) => `${(Number.isFinite(v) ? v : 0).toFixed(1).replace('.', ',')}%`
export const dataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
export const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
export const data = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')
export const arred = (v: number) => Math.round(v * 100) / 100

export const NOMES_FORMA: Record<FormaPagamento, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  debito: 'Débito',
  credito: 'Crédito',
}
export const EMOJI_FORMA: Record<FormaPagamento, string> = { dinheiro: '💵', pix: '⚡', debito: '💳', credito: '💳' }
export const FORMAS: FormaPagamento[] = ['dinheiro', 'pix', 'debito', 'credito']

export const NOMES_CATEGORIA: Record<Categoria, string> = { espeto: 'Espetos', combo: 'Combos e jantinhas', bebida: 'Bebidas', outro: 'Outros' }
export const CATEGORIAS: Categoria[] = ['espeto', 'combo', 'bebida', 'outro']

// ---------- unidades ----------

export const NOMES_UNIDADE: Record<Unidade, string> = { kg: 'kg', un: 'unidade', L: 'litro', pct: 'pacote' }
/** Unidade usada na ficha técnica: gramas para kg, ml para litro. */
export const unidadeFicha = (u: Unidade) => (u === 'kg' ? 'g' : u === 'L' ? 'ml' : u)
const fatorFicha = (u: Unidade) => (u === 'kg' || u === 'L' ? 1000 : 1)

export const custoUnitarioInsumo = (i: Insumo) => (i.qtdCompra > 0 ? i.precoCompra / i.qtdCompra : 0)

export function custoItemFicha(item: ItemFicha, insumos: Insumo[]) {
  const ins = insumos.find((i) => i.id === item.insumoId)
  if (!ins) return 0
  return (item.qtd / fatorFicha(ins.unidade)) * custoUnitarioInsumo(ins)
}

/** Custo de 1 unidade só pela ficha técnica + custo direto (sem os itens de combo). */
export function custoProduto(p: Pick<Produto, 'ficha' | 'custoDireto'>, insumos: Insumo[]) {
  return (p.custoDireto || 0) + p.ficha.reduce((s, f) => s + custoItemFicha(f, insumos), 0)
}

/**
 * Custo de 1 unidade incluindo os produtos de um combo.
 * Com as escolhas da venda usa o custo real; sem elas, considera a opção mais cara (estimativa conservadora).
 */
export function custoCompleto(p: Produto, insumos: Insumo[], produtos: Produto[], escolhas?: Escolha[], nivel = 0): number {
  let total = custoProduto(p, insumos)
  if (!p.componentes?.length || nivel > 2) return total
  const custoDe = (id: string) => {
    const x = produtos.find((y) => y.id === id)
    return x ? custoCompleto(x, insumos, produtos, undefined, nivel + 1) : 0
  }
  if (escolhas) return total + escolhas.reduce((s, e) => s + custoDe(e.produtoId) * e.qtd, 0)
  for (const c of p.componentes) total += c.qtd * Math.max(0, ...c.opcoes.map(custoDe))
  return total
}

/** Quantas unidades de cada produto saem do estoque com estes itens (inclui o que vai dentro dos combos). */
export function consumoDosItens(itens: Pick<ItemPedido, 'produtoId' | 'qtd' | 'escolhas'>[]) {
  const m: Record<string, number> = {}
  for (const i of itens) {
    m[i.produtoId] = (m[i.produtoId] ?? 0) + i.qtd
    for (const e of i.escolhas ?? []) m[e.produtoId] = (m[e.produtoId] ?? 0) + e.qtd * i.qtd
  }
  return m
}

/** Aplica uma baixa (sinal −1) ou devolução (+1) no estoque dos produtos controlados. */
/**
 * Insumos controlados que saem do estoque na venda (em kg/un do insumo).
 * Vale para produtos SEM estoque de unidades prontas — ex.: o baião da jantinha.
 * Espetos com estoque de prontos já baixaram a carne na montagem, então não entram aqui.
 */
export function consumoInsumosDosItens(itens: Pick<ItemPedido, 'produtoId' | 'qtd' | 'escolhas'>[], produtos: Produto[], insumos: Insumo[]) {
  const m: Record<string, number> = {}
  const somar = (produtoId: string, vezes: number) => {
    const p = produtos.find((x) => x.id === produtoId)
    if (!p || p.estoque !== undefined) return
    for (const f of p.ficha) {
      const ins = insumos.find((i) => i.id === f.insumoId)
      if (!ins || ins.estoque === undefined) continue
      m[ins.id] = (m[ins.id] ?? 0) + (f.qtd / fatorFicha(ins.unidade)) * vezes
    }
  }
  for (const i of itens) {
    somar(i.produtoId, i.qtd)
    for (const e of i.escolhas ?? []) somar(e.produtoId, e.qtd * i.qtd)
  }
  return m
}

export function moverEstoqueInsumos(insumos: Insumo[], consumo: Record<string, number>, sinal: 1 | -1) {
  return insumos.map((i) =>
    i.estoque !== undefined && consumo[i.id] ? { ...i, estoque: Math.round((i.estoque + sinal * consumo[i.id]) * 1000) / 1000 } : i,
  )
}

/** Quantas unidades de cada produto dá para fazer com o estoque deste insumo (ex.: 6 kg de baião → 24 jantinhas). */
export function rendePara(insumo: Insumo, produtos: Produto[], estoque = insumo.estoque ?? 0) {
  return produtos
    .filter((p) => p.ativo)
    .flatMap((p) => {
      const f = p.ficha.find((x) => x.insumoId === insumo.id)
      if (!f || f.qtd <= 0) return []
      const porcao = f.qtd / fatorFicha(insumo.unidade)
      return [{ produto: p, porcao: f.qtd, unidadePorcao: unidadeFicha(insumo.unidade), qtd: Math.max(0, Math.floor(estoque / porcao + 1e-6)) }]
    })
}

/** Embalagens sugeridas para um pedido para viagem, pelas regras da configuração. */
export function embalagensSugeridas(itens: ItemPedido[] | Pick<ItemPedido, 'categoria' | 'qtd' | 'escolhas'>[], config: Config, insumos: Insumo[]) {
  const espetos = itens.reduce(
    (s, i) => s + (i.categoria === 'espeto' ? i.qtd : 0) + (i.escolhas ?? []).reduce((t, e) => t + (e.categoria === 'espeto' ? e.qtd * i.qtd : 0), 0),
    0,
  )
  const m: Record<string, number> = {}
  for (const r of config.regrasViagem) {
    if (!insumos.some((i) => i.id === r.insumoId)) continue
    const extra = r.aCadaEspetos > 0 ? Math.floor(Math.max(0, espetos - 1) / r.aCadaEspetos) : 0
    m[r.insumoId] = (m[r.insumoId] ?? 0) + r.porPedido + extra
  }
  return m
}

export function montarEmbalagens(qtds: Record<string, number>, insumos: Insumo[]): EmbalagemPedido[] {
  return Object.entries(qtds).flatMap(([insumoId, qtd]) => {
    const ins = insumos.find((i) => i.id === insumoId)
    return ins && qtd > 0 ? [{ insumoId, nome: ins.nome, qtd, custo: arred(custoUnitarioInsumo(ins) * 1000) / 1000 }] : []
  })
}

/** Soma ao consumo de insumos as embalagens do pedido (para baixar/devolver estoque). */
export function comEmbalagens(consumo: Record<string, number>, embalagens?: EmbalagemPedido[]) {
  const m = { ...consumo }
  for (const e of embalagens ?? []) m[e.insumoId] = (m[e.insumoId] ?? 0) + e.qtd
  return m
}

export function moverEstoqueProdutos(produtos: Produto[], consumo: Record<string, number>, sinal: 1 | -1) {
  return produtos.map((p) =>
    p.estoque !== undefined && consumo[p.id] ? { ...p, estoque: p.estoque + sinal * consumo[p.id] } : p,
  )
}

/** Espetos que vão para a brasa (avulsos + dentro de combos), agrupados por nome. */
export function espetosParaBrasa(itens: ItemPedido[]) {
  const m = new Map<string, number>()
  for (const i of itens) {
    if (i.categoria === 'espeto') m.set(i.nome, (m.get(i.nome) ?? 0) + i.qtd)
    for (const e of i.escolhas ?? []) if (e.categoria === 'espeto') m.set(e.nome, (m.get(e.nome) ?? 0) + e.qtd * i.qtd)
  }
  return [...m.entries()].map(([nome, qtd]) => ({ nome, qtd }))
}

// ---------- dados iniciais (exemplo, pode editar tudo) ----------

const SAQUINHO_TERMICO: Insumo = {
  id: 'ins-saquinho',
  nome: 'Saquinho térmico',
  unidade: 'un',
  precoCompra: 30,
  qtdCompra: 100,
  estoque: 0,
  grupo: 'Embalagens',
}

const INSUMOS_INICIAIS: Insumo[] = [
  { id: 'ins-carne', nome: 'Carne bovina (alcatra/miolo)', unidade: 'kg', precoCompra: 45, qtdCompra: 1, estoque: 0, grupo: 'Carnes' },
  { id: 'ins-frango', nome: 'Frango (peito/sobrecoxa)', unidade: 'kg', precoCompra: 22, qtdCompra: 1, estoque: 0, grupo: 'Carnes' },
  { id: 'ins-linguica', nome: 'Linguiça toscana', unidade: 'kg', precoCompra: 25, qtdCompra: 1, estoque: 0, grupo: 'Carnes' },
  { id: 'ins-coracao', nome: 'Coração de frango', unidade: 'kg', precoCompra: 30, qtdCompra: 1, estoque: 0, grupo: 'Carnes' },
  { id: 'ins-queijo', nome: 'Queijo coalho', unidade: 'kg', precoCompra: 50, qtdCompra: 1, estoque: 0, grupo: 'Carnes' },
  { id: 'ins-palito', nome: 'Palito de bambu', unidade: 'un', precoCompra: 12, qtdCompra: 100, grupo: 'Espeto' },
  { id: 'ins-tempero', nome: 'Sal grosso + tempero', unidade: 'kg', precoCompra: 8, qtdCompra: 1, grupo: 'Temperos' },
  { id: 'ins-farofa', nome: 'Farofa', unidade: 'kg', precoCompra: 14, qtdCompra: 1, grupo: 'Acompanhamentos' },
  { id: 'ins-guardanapo', nome: 'Guardanapo', unidade: 'pct', precoCompra: 10, qtdCompra: 1, grupo: 'Embalagens' },
  { id: 'ins-baiao', nome: 'Baião (arroz + feijão + temperos)', unidade: 'kg', precoCompra: 12, qtdCompra: 1, estoque: 0, grupo: 'Acompanhamentos' },
  { id: 'ins-vinagrete', nome: 'Vinagrete', unidade: 'kg', precoCompra: 10, qtdCompra: 1, grupo: 'Acompanhamentos' },
  { id: 'ins-mandioca', nome: 'Mandioca cozida', unidade: 'kg', precoCompra: 8, qtdCompra: 1, grupo: 'Acompanhamentos' },
  { id: 'ins-marmita', nome: 'Marmitex/embalagem', unidade: 'un', precoCompra: 45, qtdCompra: 100, grupo: 'Embalagens' },
  SAQUINHO_TERMICO,
]

const espeto = (id: string, nome: string, emoji: string, preco: number, insumoId: string, gramas: number): Produto => ({
  id,
  nome,
  categoria: 'espeto',
  preco,
  emoji,
  custoDireto: 0.05,
  ativo: true,
  estoque: 0,
  ficha: [
    { insumoId, qtd: gramas },
    { insumoId: 'ins-palito', qtd: 1 },
    { insumoId: 'ins-tempero', qtd: 3 },
  ],
})

const bebida = (id: string, nome: string, emoji: string, preco: number, custo: number): Produto => ({
  id,
  nome,
  categoria: 'bebida',
  preco,
  emoji,
  custoDireto: custo,
  ativo: true,
  ficha: [],
})

const PRODUTOS_INICIAIS: Produto[] = [
  espeto('p-carne', 'Carne', '🥩', 10, 'ins-carne', 100),
  espeto('p-frango', 'Frango', '🍗', 8, 'ins-frango', 100),
  espeto('p-linguica', 'Linguiça', '🌭', 8, 'ins-linguica', 100),
  {
    id: 'p-misto',
    nome: 'Misto',
    categoria: 'espeto',
    preco: 10,
    emoji: '🍢',
    custoDireto: 0.05,
    ativo: true,
    estoque: 0,
    ficha: [
      { insumoId: 'ins-carne', qtd: 60 },
      { insumoId: 'ins-linguica', qtd: 50 },
      { insumoId: 'ins-palito', qtd: 1 },
      { insumoId: 'ins-tempero', qtd: 3 },
    ],
  },
  espeto('p-coracao', 'Coração', '❤️', 9, 'ins-coracao', 80),
  espeto('p-queijo', 'Queijo coalho', '🧀', 9, 'ins-queijo', 70),
  {
    id: 'p-farofa',
    nome: 'Farofa extra',
    categoria: 'outro',
    preco: 3,
    emoji: '🥣',
    custoDireto: 0.1,
    ativo: true,
    ficha: [{ insumoId: 'ins-farofa', qtd: 50 }],
  },
  {
    id: 'p-jantinha',
    nome: 'Jantinha',
    categoria: 'combo',
    preco: 22,
    emoji: '🍛',
    custoDireto: 0,
    ativo: true,
    ficha: [
      { insumoId: 'ins-baiao', qtd: 250 },
      { insumoId: 'ins-vinagrete', qtd: 60 },
      { insumoId: 'ins-mandioca', qtd: 120 },
      { insumoId: 'ins-farofa', qtd: 30 },
      { insumoId: 'ins-marmita', qtd: 1 },
    ],
    componentes: [{ id: 'c-espeto', nome: 'Espeto', qtd: 1, opcoes: ['p-carne', 'p-frango', 'p-linguica', 'p-misto', 'p-coracao', 'p-queijo'] }],
  },
  {
    id: 'p-combo3',
    nome: 'Combo 3 espetos + refri',
    categoria: 'combo',
    preco: 32,
    emoji: '🍢',
    custoDireto: 0,
    ativo: true,
    ficha: [],
    componentes: [
      { id: 'c-espetos', nome: 'Espeto', qtd: 3, opcoes: ['p-carne', 'p-frango', 'p-linguica', 'p-misto', 'p-coracao', 'p-queijo'] },
      { id: 'c-refri', nome: 'Refri', qtd: 1, opcoes: ['p-coca', 'p-guarana'] },
    ],
  },
  bebida('p-coca', 'Coca-Cola lata', '🥤', 6, 3.2),
  bebida('p-guarana', 'Guaraná lata', '🥤', 6, 2.9),
  bebida('p-agua', 'Água', '💧', 4, 1.5),
  bebida('p-cerveja', 'Cerveja lata', '🍺', 8, 3.8),
]

export const CONFIG_INICIAL: Config = {
  nomeLoja: 'Espetinho do Bairro',
  endereco: '',
  telefone: '',
  rodape: 'Obrigado e volte sempre!',
  larguraPapel: 80,
  imprimirAoFinalizar: true,
  viaChurrasqueira: true,
  viaCliente: true,
  taxaDebito: 1.99,
  taxaCredito: 4.98,
  taxaPix: 0,
  obsRapidas: ['Bem passado', 'Ao ponto', 'Mal passado', 'Sem sal', 'Com farofa', 'Sem farofa'],
  alertaEstoque: 5,
  regrasViagem: [{ insumoId: 'ins-saquinho', porPedido: 1, aCadaEspetos: 10 }],
  planilhaUrl: '',
  planilhaChave: '',
  planilhaAuto: true,
}

// ---------- armazenamento ----------

export function useEspetoDados() {
  const [insumos, setInsumos] = useLocalStorage<Insumo[]>('espeto:insumos', INSUMOS_INICIAIS)
  const [produtos, setProdutos] = useLocalStorage<Produto[]>('espeto:produtos', PRODUTOS_INICIAIS)
  const [pedidos, setPedidos] = useLocalStorage<Pedido[]>('espeto:pedidos', [])
  const [caixas, setCaixas] = useLocalStorage<Caixa[]>('espeto:caixas', [])
  const [configSalva, setConfig] = useLocalStorage<Config>('espeto:config', CONFIG_INICIAL)
  const [movEstoque, setMovEstoque] = useLocalStorage<MovEstoque[]>('espeto:estoque-mov', [])
  const config = { ...CONFIG_INICIAL, ...configSalva }

  // Quem já usava o sistema antes do espeto misto existir ganha ele uma vez (se apagar, não volta).
  useEffect(() => {
    try {
      if (localStorage.getItem('espeto:migr-misto')) return
      localStorage.setItem('espeto:migr-misto', '1')
    } catch {
      return
    }
    setProdutos((ps) => {
      if (ps.some((p) => p.id === 'p-misto' || /misto/i.test(p.nome))) return ps
      const misto = PRODUTOS_INICIAIS.find((p) => p.id === 'p-misto')!
      const ficha = misto.ficha.filter((f) => insumos.some((i) => i.id === f.insumoId))
      const pos = ps.findIndex((p) => p.id === 'p-linguica')
      const novo = { ...misto, ficha }
      return pos >= 0 ? [...ps.slice(0, pos + 1), novo, ...ps.slice(pos + 1)] : [...ps, novo]
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Saquinho térmico para quem já usava antes dele existir (uma vez só).
  useEffect(() => {
    try {
      if (localStorage.getItem('espeto:migr-saquinho')) return
      localStorage.setItem('espeto:migr-saquinho', '1')
    } catch {
      return
    }
    setInsumos((is) => (is.some((i) => i.id === SAQUINHO_TERMICO.id) ? is : [...is, SAQUINHO_TERMICO]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const caixaAberto = caixas.find((c) => !c.fechadoEm) ?? null
  return {
    insumos,
    setInsumos,
    produtos,
    setProdutos,
    pedidos,
    setPedidos,
    caixas,
    setCaixas,
    config,
    setConfig,
    movEstoque,
    setMovEstoque,
    caixaAberto,
  }
}
export type Dados = ReturnType<typeof useEspetoDados>

// ---------- regras de caixa ----------

export function taxaDaForma(forma: FormaPagamento, config: Config) {
  if (forma === 'debito') return config.taxaDebito
  if (forma === 'credito') return config.taxaCredito
  if (forma === 'pix') return config.taxaPix
  return 0
}

export interface LinhaProduto {
  produtoId: string
  nome: string
  emoji: string
  categoria: Categoria
  /** Unidades que saíram, avulsas + dentro de combos. */
  vendidos: number
  /** Quantas dessas saíram dentro de combos/jantinhas. */
  emCombos: number
  /** Estoque na abertura do caixa. */
  inicial?: number
  /** Entradas no período (montagem, compra, contagem). */
  entradas: number
  /** Estoque no fechamento (ou agora, se o caixa está aberto). */
  final?: number
  receita: number
  custo: number
}

export interface Resumo {
  pedidos: Pedido[]
  cancelados: Pedido[]
  qtdPedidos: number
  qtdViagem: number
  espetosVendidos: number
  itensVendidos: number
  faturamento: number
  descontos: number
  porForma: Record<FormaPagamento, number>
  taxas: number
  cmv: number
  despesas: number
  despesasDinheiro: number
  despesasConta: number
  sangrias: number
  suprimentos: number
  lucroBruto: number
  lucroLiquido: number
  margem: number
  ticketMedio: number
  trocoInicial: number
  dinheiroEsperado: number
  emConta: number
  porProduto: LinhaProduto[]
  /** Compras de insumos/mercadorias registradas no período (dinheiro que saiu para repor estoque). */
  compras: number
  /** Embalagens para viagem usadas (já incluídas no custo dos produtos). */
  embalagens: { nome: string; qtd: number; custo: number }[]
}

export function resumirCaixa(caixa: Caixa, todosPedidos: Pedido[], produtos: Produto[], movEstoque: MovEstoque[] = []): Resumo {
  const doCaixa = todosPedidos.filter((p) => p.caixaId === caixa.id)
  const pedidos = doCaixa.filter((p) => !p.cancelado)
  const cancelados = doCaixa.filter((p) => p.cancelado)
  const porForma: Record<FormaPagamento, number> = { dinheiro: 0, pix: 0, debito: 0, credito: 0 }
  let faturamento = 0
  let descontos = 0
  let taxas = 0
  let cmv = 0
  let espetosVendidos = 0
  let itensVendidos = 0
  const linhas = new Map<string, LinhaProduto>()

  const embs = new Map<string, { nome: string; qtd: number; custo: number }>()
  for (const p of pedidos) {
    for (const e of p.embalagens ?? []) {
      const x = embs.get(e.insumoId) ?? { nome: e.nome, qtd: 0, custo: 0 }
      x.qtd += e.qtd
      x.custo += e.qtd * e.custo
      embs.set(e.insumoId, x)
    }
    faturamento += p.total
    descontos += p.desconto
    taxas += p.taxas
    cmv += p.custoTotal
    for (const pg of p.pagamentos) porForma[pg.forma] += pg.valor
    for (const i of p.itens) {
      itensVendidos += i.qtd
      if (i.categoria === 'espeto') espetosVendidos += i.qtd
      const l = linha(i.produtoId, i)
      l.vendidos += i.qtd
      l.receita += i.preco * i.qtd
      l.custo += i.custo * i.qtd
      for (const e of i.escolhas ?? []) {
        const q = e.qtd * i.qtd
        if (e.categoria === 'espeto') espetosVendidos += q
        const le = linha(e.produtoId, { nome: e.nome, categoria: e.categoria, emoji: produtos.find((x) => x.id === e.produtoId)?.emoji ?? '' })
        le.vendidos += q
        le.emCombos += q
      }
    }
  }

  function linha(produtoId: string, base: { nome: string; categoria: Categoria; emoji: string }) {
    let l = linhas.get(produtoId)
    if (!l) {
      l = { produtoId, nome: base.nome, emoji: base.emoji, categoria: base.categoria, vendidos: 0, emCombos: 0, entradas: 0, receita: 0, custo: 0 }
      linhas.set(produtoId, l)
    }
    return l
  }

  // estoque: abertura, entradas no período e fechamento
  const fim = caixa.fechadoEm ?? '9999'
  const noPeriodo = movEstoque.filter((m) => m.criadoEm >= caixa.abertoEm && m.criadoEm <= fim)
  const controlados = new Set([
    ...Object.keys(caixa.estoque),
    ...Object.keys(caixa.estoqueFinal ?? {}),
    ...(caixa.fechadoEm ? [] : produtos.filter((p) => p.estoque !== undefined).map((p) => p.id)),
  ])
  for (const id of controlados) {
    const prod = produtos.find((x) => x.id === id)
    if (!prod && !linhas.has(id)) continue
    const l = linha(id, prod ?? { nome: '?', categoria: 'outro', emoji: '' })
    l.inicial = caixa.estoque[id]
    l.final = caixa.fechadoEm ? caixa.estoqueFinal?.[id] : prod?.estoque
    l.entradas = noPeriodo.filter((m) => m.produtoId === id).reduce((s, m) => s + m.qtd, 0)
  }
  const compras = noPeriodo.filter((m) => m.tipo === 'compra').reduce((s, m) => s + (m.valor ?? 0), 0)

  const soma = (tipo: string, origem?: string) =>
    caixa.movimentos
      .filter((m) => m.tipo === tipo && (!origem || m.origem === origem))
      .reduce((s, m) => s + m.valor, 0)
  const despesas = soma('despesa')
  const despesasDinheiro = soma('despesa', 'dinheiro')
  const despesasConta = soma('despesa', 'conta')
  const sangrias = soma('sangria')
  const suprimentos = soma('suprimento')

  const lucroBruto = faturamento - cmv
  const lucroLiquido = faturamento - taxas - cmv - despesas
  const ordemCat: Record<Categoria, number> = { espeto: 0, combo: 1, outro: 2, bebida: 3 }
  const ordemProd = (id: string) => {
    const i = produtos.findIndex((p) => p.id === id)
    return i < 0 ? 999 : i
  }

  return {
    pedidos,
    cancelados,
    qtdPedidos: pedidos.length,
    qtdViagem: pedidos.filter((p) => p.viagem).length,
    espetosVendidos,
    itensVendidos,
    faturamento,
    descontos,
    porForma,
    taxas,
    cmv,
    despesas,
    despesasDinheiro,
    despesasConta,
    sangrias,
    suprimentos,
    lucroBruto,
    lucroLiquido,
    margem: faturamento > 0 ? (lucroLiquido / faturamento) * 100 : 0,
    ticketMedio: pedidos.length ? faturamento / pedidos.length : 0,
    trocoInicial: caixa.trocoInicial,
    dinheiroEsperado: caixa.trocoInicial + porForma.dinheiro + suprimentos - sangrias - despesasDinheiro,
    emConta: porForma.pix + porForma.debito + porForma.credito - taxas - despesasConta,
    porProduto: [...linhas.values()].sort(
      (a, b) => ordemCat[a.categoria] - ordemCat[b.categoria] || ordemProd(a.produtoId) - ordemProd(b.produtoId),
    ),
    compras,
    embalagens: [...embs.values()],
  }
}

/** Reduz uma foto para caber no armazenamento do navegador. */
export function reduzirImagem(arquivo: File, lado = 220): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onerror = () => reject(leitor.error)
    leitor.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Imagem inválida'))
      img.onload = () => {
        const escala = Math.min(1, lado / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * escala)
        canvas.height = Math.round(img.height * escala)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.src = leitor.result as string
    }
    leitor.readAsDataURL(arquivo)
  })
}

// ---------- backup ----------

export function montarBackup(d: Pick<Dados, 'insumos' | 'produtos' | 'pedidos' | 'caixas' | 'movEstoque' | 'config'>) {
  return {
    versao: 2,
    geradoEm: new Date().toISOString(),
    insumos: d.insumos,
    produtos: d.produtos,
    pedidos: d.pedidos,
    caixas: d.caixas,
    movEstoque: d.movEstoque,
    config: d.config,
  }
}

/** Troca todos os dados por um backup. Mantém as ligações de salvamento deste aparelho (planilha). */
export function aplicarBackup(d: Dados, b: Partial<ReturnType<typeof montarBackup>>) {
  if (!Array.isArray(b.produtos) || !Array.isArray(b.pedidos) || !Array.isArray(b.caixas)) throw new Error('Arquivo de backup inválido.')
  d.setInsumos(b.insumos ?? [])
  d.setProdutos(b.produtos)
  d.setPedidos(b.pedidos)
  d.setCaixas(b.caixas)
  d.setMovEstoque(b.movEstoque ?? [])
  if (b.config)
    d.setConfig({ ...b.config, planilhaUrl: d.config.planilhaUrl, planilhaChave: d.config.planilhaChave, planilhaAuto: d.config.planilhaAuto })
}
