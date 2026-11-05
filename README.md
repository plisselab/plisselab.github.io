# Loja 3D + Calculadora de Custo

- **Página principal (`/`)**: loja para os clientes verem os produtos, montarem um carrinho e enviarem o pedido pelo WhatsApp. Antes de enviar, o cliente informa nome, endereço (o CEP preenche rua, bairro, cidade e estado via ViaCEP) e forma de pagamento; a mensagem chega com itens, subtotal, taxa de entrega fixa (`taxaEntrega` em `src/loja/config.ts`) e total. Carrinho e dados de entrega ficam salvos no navegador do cliente.
- **Calculadora (`/#calculadora`)**: ferramenta interna, sem nenhum link na loja.
- **PDV de Espetinho (`/#espetinho`)**: sistema de vendas e controle de custo para espetinho, também sem link na loja (veja abaixo).

## PDV de Espetinho (`/#espetinho`)

Código em `src/espetinho/`. Tudo fica salvo no navegador do aparelho (use **Config → Baixar backup** com frequência).

**Online:** a publicação no GitHub Pages (`.github/workflows/deploy-pages.yml`, a cada push na `main`) inclui o PDV em `/pdv/`. Toda atualização do código entra no ar sozinha; basta recarregar a página.

**Google Drive (Config → 📁 Salvar as vendas no Google Drive — recomendado):** com o Google Drive para computador instalado, escolha uma pasta dentro do Drive uma vez; a cada mudança o PDV grava ali `pdv-espetinho-backup.json`, os CSVs (Caixas, Pedidos, Itens vendidos, Estoque, Mov. estoque, Despesas — padrão brasileiro, abrem no Excel/Planilhas) e uma cópia por dia em `backups-diarios/`. Usa a API de acesso a arquivos do Chrome/Edge (`src/espetinho/pasta.ts`). Escolhendo a mesma pasta em outro computador, o PDV pergunta se deve usar os dados de lá.

**Google Planilhas (Config → Avançado):** o PDV copia um código de Apps Script (`src/espetinho/appsScript.ts`) com uma chave secreta; colado na planilha e implantado como App da Web, ele recebe a cada mudança as abas Caixas, Pedidos, Itens vendidos, Estoque, Mov. estoque e Despesas, mais uma cópia completa escondida (`_backup`) usada para carregar os dados em outro computador. O navegador continua sendo o armazenamento principal (funciona offline e reenvia quando a internet volta). Nada é enviado antes de conferir a planilha, para um aparelho vazio não apagar os dados de lá.

**Usar no computador do caixa sem site:** baixe `pdv/pdv-espetinho.html` e abra no Chrome (duplo clique). É o sistema inteiro num arquivo só e funciona sem internet. Deixe o arquivo sempre na mesma pasta: o Chrome guarda os dados junto do endereço do arquivo. Para atualizar o arquivo depois de mudanças no código: `npm run build:pdv`.

- **Vender**: botões grandes com foto/emoji de cada espeto, combo/jantinha, bebida e acompanhamento. Combos e jantinhas abrem a escolha do espeto (e do refri) na hora. Um toque adiciona; `+`/`−` ajustam; “+ observação” tem atalhos (bem passado, sem sal…). Marcação **Comer aqui / Para viagem**, nome do cliente, pagamento em dinheiro (com troco), Pix, débito, crédito ou dividido, e desconto.
- **Cupom**: ao confirmar, imprime a **via da churrasqueira** (nº do pedido enorme, PARA VIAGEM em tarja preta, itens, espetos de dentro dos combos e observações em letra grande, quadro “PRA BRASA” com o total por tipo de espeto, sem preços) e a **via do cliente** (preços, pagamento, troco, “não é documento fiscal”). Papel 58 ou 80 mm.
- **Estoque**: a carne entra em **kg** quando chega (“Chegou compra”, com valor pago → custo médio atualizado). Em **“Montar espetos”** você informa quantos espetos saíram e quantos kg usou: baixa os kg, soma os espetos prontos e mostra o rendimento real (g por espeto) com opção de corrigir a ficha. Vendas (inclusive dentro de combos) baixam os espetos prontos; cancelamento devolve. “Contagem” corrige diferenças e registra perdas.
- **Espeto misto**: produto com ficha de dois insumos (ex.: 60 g de carne + 50 g de linguiça). Em **Montar espetos** você lança carne, linguiça e misto de uma vez e vê quanto de cada carne vai para cada espeto, a sobra e quantos ainda dá para montar com ela. O peso real é dividido entre os espetos na proporção da ficha. O quadro **Para onde foi a carne** (7/30 dias) mostra quantos kg viraram cada espeto.
- **Insumos personalizados**: “+ Novo insumo” cria qualquer insumo (carvão, saquinho grande, pimenta…) com grupo (Carnes, Embalagens, Temperos… ou um seu), unidade, preço de compra e controle de estoque opcional.
- **Saquinho térmico / embalagem para viagem**: em Config → Embalagem para viagem, regras como “1 saquinho por pedido + 1 a cada 10 espetos”. Ao marcar Para viagem, a quantidade sugerida aparece no pedido (ajustável com + e −), o custo entra no lucro, o estoque baixa (e volta se cancelar) e a via da churrasqueira mostra “EMBALAR: 2 SAQUINHO TÉRMICO”.
- **Baião e acompanhamentos**: em Estoque → **Preparei**, lance quantos kg rendeu (e, se quiser, quanto gastou nos ingredientes). O sistema mostra para quantas jantinhas dá (pela porção da ficha, ex.: 250 g), baixa a porção a cada jantinha vendida e bloqueia a jantinha quando o baião acaba.
- **Painel**: faturamento, espetos vendidos (avulsos + em combos), espetos prontos restantes (com alerta de estoque baixo), lucro até agora, totais por forma de pagamento e fila de pedidos (entregue / reimprimir / cancelar).
- **Caixa**: abrir com troco inicial (o estoque da abertura e do fechamento é registrado sozinho); lançar despesas do dia (carvão, gelo…), retiradas e reforços; fechar contando o dinheiro (mostra se sobrou ou faltou).
- **Relatórios**: por caixa (início / entrou / vendido / sobrou de cada espeto) e resumo do mês, com compras de carne/insumos e perdas — quanto em dinheiro, quanto em conta (já sem taxa da maquininha), custo dos produtos, despesas e **lucro**. Pode imprimir na térmica.
- **Cadastros**: insumos (quanto pagou ÷ quanto veio = custo por kg/unidade) e produtos com **ficha técnica** (ex.: 100 g de carne + 1 palito + 3 g de tempero). O custo, lucro por unidade, margem e preço sugerido são calculados sozinhos.

**Lucro** = faturamento − custo dos insumos dos itens vendidos − taxas da maquininha − despesas do dia.

### Impressora térmica (Waytech)

1. Instale o driver no Windows e deixe a Waytech como impressora padrão, com papel 80 mm e **corte automático ao fim de cada página**. Cada via é enviada como uma página do tamanho exato do conteúdo, então cada via sai cortada separada.
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
