export type Unidade = 'kg' | 'un' | 'L' | 'pct'

/** Insumo comprado (carne, palito, farofa...). O custo por unidade é precoCompra ÷ qtdCompra. */
export interface Insumo {
  id: string
  nome: string
  unidade: Unidade
  /** Quanto pagou na compra (R$). */
  precoCompra: number
  /** Quanto veio na compra, na unidade do insumo (ex.: 5 kg, 100 un). */
  qtdCompra: number
}

export type Categoria = 'espeto' | 'bebida' | 'outro'

/** Quanto de um insumo vai em 1 unidade do produto. Em gramas se o insumo é kg, em ml se é L. */
export interface ItemFicha {
  insumoId: string
  qtd: number
}

export interface Produto {
  id: string
  nome: string
  categoria: Categoria
  /** Preço de venda. */
  preco: number
  emoji: string
  /** Foto reduzida (data URL). Se existir, aparece no botão no lugar do emoji. */
  imagem?: string
  /** Ficha técnica: insumos usados em 1 unidade. */
  ficha: ItemFicha[]
  /** Custo que não vem de insumo (ex.: refri comprado pronto, embalagem). */
  custoDireto: number
  ativo: boolean
}

export type FormaPagamento = 'dinheiro' | 'pix' | 'debito' | 'credito'

export interface Pagamento {
  forma: FormaPagamento
  /** Valor que abate do pedido. */
  valor: number
}

export interface ItemPedido {
  produtoId: string
  nome: string
  categoria: Categoria
  emoji: string
  preco: number
  /** Custo unitário no momento da venda. */
  custo: number
  qtd: number
  obs: string
}

export interface Pedido {
  id: string
  numero: number
  caixaId: string
  criadoEm: string
  cliente: string
  viagem: boolean
  itens: ItemPedido[]
  subtotal: number
  desconto: number
  total: number
  pagamentos: Pagamento[]
  /** Quanto o cliente entregou em dinheiro (para calcular o troco). */
  recebidoDinheiro: number
  troco: number
  /** Taxa da maquininha (débito/crédito/pix) calculada na hora da venda. */
  taxas: number
  custoTotal: number
  cancelado: boolean
  entregue: boolean
}

export type TipoMovimento = 'despesa' | 'sangria' | 'suprimento'

export interface Movimento {
  id: string
  tipo: TipoMovimento
  descricao: string
  valor: number
  /** De onde saiu (despesa) ou para onde foi o dinheiro. */
  origem: 'dinheiro' | 'conta'
  criadoEm: string
}

export interface Caixa {
  id: string
  numero: number
  abertoEm: string
  fechadoEm?: string
  /** Dinheiro na gaveta ao abrir (troco). */
  trocoInicial: number
  /** Quantas unidades de cada produto foram preparadas/levadas para o dia. Sem valor = sem controle. */
  estoque: Record<string, number>
  movimentos: Movimento[]
  /** Dinheiro contado na gaveta ao fechar. */
  dinheiroContado?: number
  observacao?: string
}

export interface Config {
  nomeLoja: string
  endereco: string
  telefone: string
  rodape: string
  larguraPapel: 58 | 80
  imprimirAoFinalizar: boolean
  viaChurrasqueira: boolean
  viaCliente: boolean
  /** % cobrada pela maquininha. */
  taxaDebito: number
  taxaCredito: number
  taxaPix: number
  /** Observações de um toque para os espetos (ponto da carne etc.). */
  obsRapidas: string[]
  /** Avisar quando restarem esta quantidade ou menos. */
  alertaEstoque: number
}
