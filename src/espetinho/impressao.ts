import { NOMES_FORMA, brl, data, hora, type Resumo } from './dados'
import type { Caixa, Config, Pedido } from './tipos'

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

const numPedido = (n: number) => String(n).padStart(3, '0')

/**
 * Estilo pensado para impressora térmica (Waytech 58/80 mm):
 * só preto puro, letra grossa e grande, sem cinza (a térmica não imprime tons).
 */
function estilo(config: Config) {
  const largura = config.larguraPapel === 58 ? 48 : 72
  const base = config.larguraPapel === 58 ? 12 : 14
  return `
  @page { size: ${config.larguraPapel}mm auto; margin: 0; }
  * { box-sizing: border-box; color: #000 !important; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { width: ${largura}mm; margin: 0 auto; padding: 2mm 0 6mm; font-family: Arial, Helvetica, sans-serif;
         font-size: ${base}px; line-height: 1.25; font-weight: 600; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .via { page-break-after: always; break-after: page; }
  .via:last-child { page-break-after: auto; break-after: auto; }
  .c { text-align: center; }
  .loja { font-size: ${base + 4}px; font-weight: 900; text-align: center; text-transform: uppercase; }
  .peq { font-size: ${base - 2}px; font-weight: 600; }
  .tag { font-size: ${base - 1}px; font-weight: 900; text-align: center; letter-spacing: 1px; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 1mm 0; margin: 1.5mm 0; }
  .num { font-size: ${base * 2.4}px; font-weight: 900; text-align: center; line-height: 1.05; margin: 1mm 0; }
  .num small { display: block; font-size: ${base}px; font-weight: 700; }
  .viagem { background: #000; color: #fff !important; text-align: center; font-size: ${base + 8}px; font-weight: 900; padding: 2mm 0; margin: 2mm 0; }
  .viagem * { color: #fff !important; }
  .local { border: 3px solid #000; text-align: center; font-size: ${base + 6}px; font-weight: 900; padding: 1.5mm 0; margin: 2mm 0; }
  .cliente { font-size: ${base + 4}px; font-weight: 900; text-align: center; margin: 1mm 0; text-transform: uppercase; }
  hr { border: 0; border-top: 2px dashed #000; margin: 2mm 0; }
  hr.forte { border-top: 3px solid #000; }
  .sec { font-size: ${base}px; font-weight: 900; text-transform: uppercase; margin: 1mm 0; text-decoration: underline; }
  table { width: 100%; border-collapse: collapse; }
  td { vertical-align: top; padding: 0.6mm 0; }
  .item td { font-size: ${base + 8}px; font-weight: 900; line-height: 1.15; padding-top: 1.2mm; }
  .item .q { width: 1%; white-space: nowrap; padding-right: 2mm; }
  .obs td { font-size: ${base + 2}px; font-weight: 800; padding-left: 0; }
  .obs .seta { padding-right: 2mm; }
  .r { text-align: right; white-space: nowrap; }
  .tot td { font-size: ${base + 6}px; font-weight: 900; padding-top: 1mm; }
  .linha td { font-size: ${base}px; }
  .grande { font-size: ${base + 4}px; font-weight: 900; }
  .rodape { text-align: center; font-size: ${base - 1}px; margin-top: 2mm; }
  `
}

function cabecalhoLoja(config: Config) {
  return `<div class="loja">${esc(config.nomeLoja)}</div>
  ${config.endereco ? `<div class="c peq">${esc(config.endereco)}</div>` : ''}
  ${config.telefone ? `<div class="c peq">${esc(config.telefone)}</div>` : ''}`
}

const blocoViagem = (p: Pedido) =>
  p.viagem ? `<div class="viagem">PARA VIAGEM</div>` : `<div class="local">COMER AQUI</div>`

/** Via da churrasqueira: sem preço, letra enorme, só o que precisa ir pra brasa. */
function viaChurrasqueira(p: Pedido) {
  const grupos: { titulo: string; itens: Pedido['itens'] }[] = [
    { titulo: 'Espetos', itens: p.itens.filter((i) => i.categoria === 'espeto') },
    { titulo: 'Acompanhamentos', itens: p.itens.filter((i) => i.categoria === 'outro') },
    { titulo: 'Bebidas', itens: p.itens.filter((i) => i.categoria === 'bebida') },
  ].filter((g) => g.itens.length)
  const totalEspetos = p.itens.filter((i) => i.categoria === 'espeto').reduce((s, i) => s + i.qtd, 0)

  return `<div class="via">
    <div class="tag">VIA DA CHURRASQUEIRA</div>
    <div class="num"><small>PEDIDO</small>Nº ${numPedido(p.numero)}</div>
    <div class="c">${hora(p.criadoEm)} · ${data(p.criadoEm)}</div>
    ${blocoViagem(p)}
    ${p.cliente ? `<div class="cliente">${esc(p.cliente)}</div>` : ''}
    ${grupos
      .map(
        (g) => `<hr class="forte"><div class="sec">${g.titulo}</div>
      <table>${g.itens
        .map(
          (i) => `<tr class="item"><td class="q">${i.qtd}x</td><td>${esc(i.nome.toUpperCase())}</td></tr>
          ${i.obs ? `<tr class="obs"><td class="seta r">&gt;&gt;</td><td>${esc(i.obs.toUpperCase())}</td></tr>` : ''}`,
        )
        .join('')}</table>`,
      )
      .join('')}
    <hr class="forte">
    ${totalEspetos ? `<div class="c grande">TOTAL DE ESPETOS: ${totalEspetos}</div>` : ''}
  </div>`
}

/** Via do cliente: com preços, pagamento e troco. */
function viaCliente(p: Pedido, config: Config) {
  return `<div class="via">
    ${cabecalhoLoja(config)}
    <div class="tag">CUPOM NÃO FISCAL</div>
    <div class="num"><small>PEDIDO</small>Nº ${numPedido(p.numero)}</div>
    <div class="c">${data(p.criadoEm)} ${hora(p.criadoEm)}</div>
    ${p.viagem ? `<div class="viagem">PARA VIAGEM</div>` : ''}
    ${p.cliente ? `<div class="c grande">${esc(p.cliente)}</div>` : ''}
    <hr>
    <table>
      ${p.itens
        .map(
          (i) => `<tr class="linha"><td>${i.qtd}x ${esc(i.nome)}${i.obs ? `<br><span class="peq">&gt; ${esc(i.obs)}</span>` : ''}</td>
          <td class="r">${brl(i.preco * i.qtd)}</td></tr>`,
        )
        .join('')}
    </table>
    <hr>
    <table>
      ${p.desconto > 0 ? `<tr class="linha"><td>Subtotal</td><td class="r">${brl(p.subtotal)}</td></tr><tr class="linha"><td>Desconto</td><td class="r">-${brl(p.desconto)}</td></tr>` : ''}
      <tr class="tot"><td>TOTAL</td><td class="r">${brl(p.total)}</td></tr>
      ${p.pagamentos.map((pg) => `<tr class="linha"><td>${NOMES_FORMA[pg.forma]}</td><td class="r">${brl(pg.valor)}</td></tr>`).join('')}
      ${p.recebidoDinheiro > 0 ? `<tr class="linha"><td>Recebido em dinheiro</td><td class="r">${brl(p.recebidoDinheiro)}</td></tr>` : ''}
      ${p.troco > 0 ? `<tr class="tot"><td>TROCO</td><td class="r">${brl(p.troco)}</td></tr>` : ''}
    </table>
    <hr>
    ${config.rodape ? `<div class="rodape">${esc(config.rodape)}</div>` : ''}
    <div class="rodape peq">NÃO É DOCUMENTO FISCAL</div>
  </div>`
}

function imprimirHTML(corpo: string, config: Config) {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument!
  doc.open()
  doc.write(
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Cupom</title><style>${estilo(config)}</style></head><body>${corpo}</body></html>`,
  )
  doc.close()
  const remover = () => setTimeout(() => iframe.remove(), 1000)
  iframe.contentWindow!.addEventListener('afterprint', remover)
  setTimeout(() => {
    iframe.contentWindow!.focus()
    iframe.contentWindow!.print()
    // alguns navegadores não disparam afterprint
    setTimeout(() => iframe.isConnected && iframe.remove(), 60000)
  }, 150)
}

export function imprimirPedido(p: Pedido, config: Config, vias?: { churrasqueira: boolean; cliente: boolean }) {
  const v = vias ?? { churrasqueira: config.viaChurrasqueira, cliente: config.viaCliente }
  const partes: string[] = []
  if (v.churrasqueira) partes.push(viaChurrasqueira(p))
  if (v.cliente) partes.push(viaCliente(p, config))
  if (!partes.length) partes.push(viaCliente(p, config))
  imprimirHTML(partes.join(''), config)
}

export function imprimirRelatorio(caixa: Caixa, r: Resumo, config: Config) {
  const linha = (rotulo: string, valor: string, cls = 'linha') =>
    `<tr class="${cls}"><td>${rotulo}</td><td class="r">${valor}</td></tr>`
  const corpo = `<div class="via">
    ${cabecalhoLoja(config)}
    <div class="tag">FECHAMENTO DE CAIXA Nº ${caixa.numero}</div>
    <div class="c">Aberto: ${data(caixa.abertoEm)} ${hora(caixa.abertoEm)}</div>
    ${caixa.fechadoEm ? `<div class="c">Fechado: ${data(caixa.fechadoEm)} ${hora(caixa.fechadoEm)}</div>` : '<div class="c">(PARCIAL - caixa aberto)</div>'}
    <hr class="forte"><div class="sec">Vendas</div>
    <table>
      ${linha('Pedidos', String(r.qtdPedidos))}
      ${linha('Para viagem', String(r.qtdViagem))}
      ${linha('Espetos vendidos', String(r.espetosVendidos))}
      ${linha('Ticket médio', brl(r.ticketMedio))}
      ${r.descontos > 0 ? linha('Descontos dados', brl(r.descontos)) : ''}
      ${r.cancelados.length ? linha('Cancelados', String(r.cancelados.length)) : ''}
      ${linha('FATURAMENTO', brl(r.faturamento), 'tot')}
    </table>
    <hr class="forte"><div class="sec">Por forma de pagamento</div>
    <table>
      ${linha('Dinheiro', brl(r.porForma.dinheiro))}
      ${linha('Pix', brl(r.porForma.pix))}
      ${linha('Débito', brl(r.porForma.debito))}
      ${linha('Crédito', brl(r.porForma.credito))}
    </table>
    <hr class="forte"><div class="sec">Dinheiro na gaveta</div>
    <table>
      ${linha('Troco inicial', brl(r.trocoInicial))}
      ${linha('+ Vendas em dinheiro', brl(r.porForma.dinheiro))}
      ${r.suprimentos ? linha('+ Suprimentos', brl(r.suprimentos)) : ''}
      ${r.sangrias ? linha('- Sangrias/retiradas', brl(r.sangrias)) : ''}
      ${r.despesasDinheiro ? linha('- Despesas pagas em dinheiro', brl(r.despesasDinheiro)) : ''}
      ${linha('ESPERADO', brl(r.dinheiroEsperado), 'tot')}
      ${caixa.dinheiroContado !== undefined ? linha('Contado', brl(caixa.dinheiroContado)) + linha('Diferença', brl(caixa.dinheiroContado - r.dinheiroEsperado)) : ''}
    </table>
    <hr class="forte"><div class="sec">Em conta (Pix + cartão)</div>
    <table>
      ${linha('Pix + cartões', brl(r.porForma.pix + r.porForma.debito + r.porForma.credito))}
      ${linha('- Taxas maquininha', brl(r.taxas))}
      ${r.despesasConta ? linha('- Despesas pagas da conta', brl(r.despesasConta)) : ''}
      ${linha('EM CONTA', brl(r.emConta), 'tot')}
    </table>
    <hr class="forte"><div class="sec">Lucro</div>
    <table>
      ${linha('Faturamento', brl(r.faturamento))}
      ${linha('- Custo dos produtos', brl(r.cmv))}
      ${linha('- Taxas maquininha', brl(r.taxas))}
      ${linha('- Despesas do dia', brl(r.despesas))}
      ${linha('LUCRO', brl(r.lucroLiquido), 'tot')}
    </table>
    <hr class="forte"><div class="sec">Produtos (vendido / sobrou)</div>
    <table>
      ${r.porProduto
        .map((l) =>
          linha(`${l.vendidos}x ${esc(l.nome)}`, l.restante !== undefined ? `sobrou ${l.restante}` : brl(l.receita)),
        )
        .join('')}
    </table>
    ${
      caixa.movimentos.length
        ? `<hr class="forte"><div class="sec">Despesas e retiradas</div><table>${caixa.movimentos
            .map((m) => linha(`${m.tipo === 'despesa' ? 'Desp.' : m.tipo === 'sangria' ? 'Retirada' : 'Supr.'} ${esc(m.descricao)}`, brl(m.valor)))
            .join('')}</table>`
        : ''
    }
    ${caixa.observacao ? `<hr><div>Obs: ${esc(caixa.observacao)}</div>` : ''}
    <hr><div class="rodape peq">Impresso em ${data(new Date().toISOString())} ${hora(new Date().toISOString())}</div>
  </div>`
  imprimirHTML(corpo, config)
}

export function imprimirTeste(config: Config) {
  imprimirHTML(
    `<div class="via">${cabecalhoLoja(config)}<div class="tag">TESTE DE IMPRESSÃO</div>
    <div class="num"><small>PEDIDO</small>Nº 000</div><div class="viagem">PARA VIAGEM</div>
    <table><tr class="item"><td class="q">3x</td><td>CARNE</td></tr><tr class="obs"><td class="seta r">&gt;&gt;</td><td>BEM PASSADO</td></tr></table>
    <hr><div class="c">Papel de ${config.larguraPapel} mm. Se cortou nas bordas, troque a largura nas configurações.</div></div>`,
    config,
  )
}
