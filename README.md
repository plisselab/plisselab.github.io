# Loja 3D + Calculadora de Custo

- **Página principal (`/`)**: loja para os clientes verem os produtos, montarem um carrinho e enviarem o pedido pelo WhatsApp. Antes de enviar, o cliente informa nome, endereço (o CEP preenche rua, bairro, cidade e estado via ViaCEP) e forma de pagamento; a mensagem chega com itens, subtotal, taxa de entrega fixa (`taxaEntrega` em `src/loja/config.ts`) e total. Carrinho e dados de entrega ficam salvos no navegador do cliente.
- **Calculadora (`/#calculadora`)**: ferramenta interna, sem nenhum link na loja.
- **PDV de Espetinho (`/#espetinho`)**: sistema de vendas e controle de custo para espetinho, também sem link na loja (veja abaixo).

## PDV de Espetinho (`/#espetinho`)

Código em `src/espetinho/`. Tudo fica salvo no navegador do aparelho (use **Config → Baixar backup** com frequência).

- **Vender**: botões grandes com foto/emoji de cada espeto, bebida e acompanhamento. Um toque adiciona; `+`/`−` ajustam; “+ observação” tem atalhos (bem passado, sem sal…). Marcação **Comer aqui / Para viagem**, nome do cliente, pagamento em dinheiro (com troco), Pix, débito, crédito ou dividido, e desconto.
- **Cupom**: ao confirmar, imprime a **via da churrasqueira** (nº do pedido enorme, PARA VIAGEM em tarja preta, itens e observações em letra grande, sem preços) e a **via do cliente** (preços, pagamento, troco, “não é documento fiscal”). Papel 58 ou 80 mm.
- **Painel**: faturamento, espetos vendidos, quantos restam do que foi preparado (com alerta de estoque baixo e “repor”), lucro até agora, totais por forma de pagamento e fila de pedidos (entregue / reimprimir / cancelar).
- **Caixa**: abrir com troco inicial e quantidade preparada de cada produto; lançar despesas do dia (carvão, gelo…), retiradas e reforços; fechar contando o dinheiro (mostra se sobrou ou faltou).
- **Relatórios**: por caixa e resumo do mês — quanto em dinheiro, quanto em conta (já sem taxa da maquininha), custo dos produtos, despesas e **lucro**. Pode imprimir na térmica.
- **Cadastros**: insumos (quanto pagou ÷ quanto veio = custo por kg/unidade) e produtos com **ficha técnica** (ex.: 100 g de carne + 1 palito + 3 g de tempero). O custo, lucro por unidade, margem e preço sugerido são calculados sozinhos.

**Lucro** = faturamento − custo dos insumos dos itens vendidos − taxas da maquininha − despesas do dia.

### Impressora térmica (Waytech)

1. Instale o driver no Windows e deixe a Waytech como impressora padrão, com papel de rolo 80 mm (ou 58 mm).
2. Na primeira impressão pelo Chrome: destino Waytech, margens “Nenhuma”, escala 100%, sem cabeçalhos/rodapés.
3. Para imprimir direto, sem a janela de impressão, abra o Chrome com `--kiosk-printing` no atalho.
4. Use **Config → Imprimir teste** para conferir.

## Personalizando a loja

Tudo fica em `src/loja/config.ts`:

- `whatsapp`: seu número só com números, com 55 + DDD (ex.: `5511912345678`)
- `nome`, `slogan`, `cidade`, `instagram`
- `marketplaces`: links da sua loja na Shopee, Mercado Livre, Elo7 etc.
- `iconesCategorias`: emoji de cada categoria no menu de categorias (abaixo da busca)
- `produtos`: nome, descrição, categoria, preço (sem preço = "Sob consulta") e links do produto nos marketplaces

Fotos: coloque os arquivos em `public/produtos/` e informe o nome em `imagem` (ex.: `imagem: 'vaso.jpg'`). Sem foto, o produto mostra o emoji.

## Calculadora de Custo 3D

App web para calcular o custo e o preço de venda sugerido de impressões 3D, baseado na planilha de precificação usada como referência (filamento, energia, mão de obra e margem de lucro).

## Como funciona o cálculo

1. **Custo de filamento** = (preço do filamento por kg ÷ 1000) × gramas usadas
2. **Custo de energia** = (tarifa de energia × potência da impressora ÷ 1000) × horas de impressão
3. **Custos opcionais**: desgaste/depreciação da impressora, embalagem e % de falhas/desperdício
4. **Custo total** = soma de todos os custos acima
5. **Lucro** = custo total × margem de lucro (%)
6. **Preço sugerido** = custo total + lucro + mão de obra

O resultado pode ser multiplicado pela quantidade de peças e salvo no histórico (armazenado localmente no navegador).

## Rodando localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:5173`.

## Build de produção

```bash
npm run build
npm run preview
```

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- Persistência local via `localStorage` (sem backend)
