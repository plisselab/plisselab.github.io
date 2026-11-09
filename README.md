# Loja 3D + Calculadora de Custo

- **Página principal (`/`)**: loja para os clientes verem os produtos, montarem um carrinho e enviarem o pedido pelo WhatsApp. Antes de enviar, o cliente informa nome, endereço (o CEP preenche rua, bairro, cidade e estado via ViaCEP) e forma de pagamento; a mensagem chega com itens, subtotal, taxa de entrega fixa (`taxaEntrega` em `src/loja/config.ts`) e total. Carrinho e dados de entrega ficam salvos no navegador do cliente.
- **Calculadora (`/#calculadora`)**: ferramenta interna, sem nenhum link na loja.
- **PDV de Espetinho (`/#espetinho`)**: sistema de vendas e controle de custo para espetinho, também sem link na loja (veja abaixo).

## PDV de Espetinho (`/#espetinho`)

Código em `src/espetinho/`. Tudo fica salvo no navegador do aparelho (use **Config → Baixar backup** com frequência).

**Online:** a publicação no GitHub Pages (`.github/workflows/deploy-pages.yml`, a cada push na `main`) inclui o PDV em `/pdv/`. Toda atualização do código entra no ar sozinha; basta recarregar a página.

**Google Drive (Config → 📁 Salvar as vendas no Google Drive — recomendado):** com o Google Drive para computador instalado, escolha uma pasta dentro do Drive uma vez; a cada mudança o PDV grava ali `pdv-espetinho-backup.json`, os CSVs (Caixas, Pedidos, Itens vendidos, Estoque, Mov. estoque, Despesas — padrão brasileiro, abrem no Excel/Planilhas) e uma cópia por dia em `backups-diarios/`. Usa a API de acesso a arquivos do Chrome/Edge (`src/espetinho/pasta.ts`). Escolhendo a mesma pasta em outro computador, o PDV pergunta se deve usar os dados de lá.

**Atualização automática entre aparelhos:** ao abrir, a cada minuto (planilha) ou 30 s (pasta) e quando a tela volta a ficar visível, o PDV confere se outro aparelho salvou dados mais novos e carrega sozinho, com o aviso “🔄 Dados atualizados”. Se este aparelho tiver mudanças ainda não enviadas, ou nunca tiver sincronizado e já tiver vendas, ele pergunta em vez de sobrescrever. Dados que chegaram de fora não são reenviados (`src/espetinho/sincronia.ts`), para dois aparelhos não ficarem se atualizando sem parar.

**Celular (Config → 📱 Usar no celular):** com a planilha ligada no computador, “Conectar celular” mostra um QR code (ou link para WhatsApp) que abre o PDV no celular já ligado à mesma planilha (`src/espetinho/conectar.ts`); o celular recebe os dados e se atualiza sozinho. O PDV publicado em `/pdv/` pode ser instalado como aplicativo (manifesto e ícones em `public/pdv/`). A pasta do Drive não funciona em celular (os navegadores não permitem).

**Google Planilhas (Config → Avançado):** o PDV copia um código de Apps Script (`src/espetinho/appsScript.ts`) com uma chave secreta; colado na planilha e implantado como App da Web, ele recebe a cada mudança as abas Caixas, Pedidos, Itens vendidos, Estoque, Mov. estoque e Despesas, mais uma cópia completa escondida (`_backup`) usada para carregar os dados em outro computador. O navegador continua sendo o armazenamento principal (funciona offline e reenvia quando a internet volta). Nada é enviado antes de conferir a planilha, para um aparelho vazio não apagar os dados de lá.

**Usar no computador do caixa sem site:** baixe `pdv/pdv-espetinho.html` e abra no Chrome (duplo clique). É o sistema inteiro num arquivo só e funciona sem internet. Deixe o arquivo sempre na mesma pasta: o Chrome guarda os dados junto do endereço do arquivo. Para atualizar o arquivo depois de mudanças no código: `npm run build:pdv`.

- **Vender**: botões grandes com foto/emoji de cada espeto, combo/jantinha, bebida e acompanhamento. Combos e jantinhas abrem a escolha do espeto (e do refri) na hora. Um toque adiciona; `+`/`−` ajustam; “+ observação” tem atalhos (bem passado, sem sal…). Marcação **Comer aqui / Para viagem**, nome do cliente, pagamento em dinheiro (com troco), Pix, débito, crédito ou dividido, e desconto.
- **Comandas** (aba 📝): abra por mesa + nome, vá lançando itens (mesma tela de venda, com combos e observações; a churrasqueira recebe só os itens novos, marcados “MAIS ITENS” a partir do 2º lançamento). Os itens saem do estoque ao serem lançados; o dinheiro entra no caixa quando é pago. Receba tudo, só os itens escolhidos ou divida igualmente entre N pessoas (cada uma paga com sua forma e ganha seu cupom; a última parte fecha o centavo). Imprime conferência da conta, aceita estorno pelo Painel (a conta reabre) e avisa no fechamento do caixa sobre comandas abertas, que seguem para o próximo caixa.
- **Bar**: categoria “Doses e drinks”. Bebidas compradas em litros (lance por garrafa/barril: 6 × 965 ml = 5,79 L) ficam em estoque em L e cada dose desconta os ml da ficha (padrão 50 ml para destilados; 300/500 ml para chopp); o botão mostra quantas doses ainda dá. “🥃 Nova dose / drink” cria a dose com custo, lucro e doses por garrafa; “🍹 Exemplos de bar” adiciona cachaça, vodka, whisky, chopp, caipirinha e caipiroska. “🥤 Montar copões” cria um Copão por destilado (dose em ml + copo) em que, na venda, o caixa escolhe o gelo de sabor e a mistura (energético, suco…); a mistura pode ser por unidade (lata) ou por ml de garrafa grande (ex.: energético 2 L, 250 ml por copão — custo e estoque em litros); cada mistura pode ter acréscimo no preço, e o assistente mostra custo e lucro por copão. Comandas podem ser juntadas (mesas que se juntam) e, depois de pagas, imprimem a conta completa e o cupom de cada pagamento.
- **Adega**: campo “Bipe ou busque” na venda (leitor de código de barras USB funciona até sem clicar no campo; câmera no Android); código novo é vinculado ao produto na hora. **Fardos** (“📦 Criar fardo”): botão com preço próprio que tira N unidades do estoque. **🧾 Compras**: botão grande “+ Nova compra” abre a página da compra em 3 passos — 1) fornecedor (com os já usados em um toque) e nº da nota; 2) tabela de produtos: bipe o código ou digite o nome e aperte Enter (código novo cadastra o produto na hora), quantidade em caixas × unidades ou unidades, custo unitário ou total, último preço pago (▲/▼) e o mais barato em 90 dias, preço atual → preço novo e margem; “💲 Precificar todos” com a margem desejada (arredonda de R$ 0,50 em R$ 0,50, com opção de não baixar preço); 3) conferir (estoque antes → depois, preço antigo → novo) e lançar: soma no estoque, atualiza o custo médio e os preços. A compra em andamento fica salva se você sair da tela. **📸 Ler nota por foto**: tire foto(s) da nota (ou mande o PDF da DANFE) e a IA Claude (API da Anthropic, chave do próprio dono guardada só no aparelho — Configurações → 🤖) lê fornecedor, nº, itens, quantidades, caixas e valores; o PDV acha o produto pelo código de barras, pelo nome já visto em outra nota ou por semelhança (exige a marca), mostra tudo para conferir/corrigir (⚠ nas linhas duvidosas, soma × total da nota) e só então coloca na compra — o que você escolher fica aprendido. A compra aceita também **espetos prontos** (o custo passa a ser o da compra; a ficha antiga fica guardada) e **insumos** (carne em kg, embalagens, garrafas para dose em litros — o tamanho escrito na nota, como 965ML ou 5KG, vira kg/L), que somam no estoque de insumos e atualizam o custo médio. **🔁 Reposição**: vendas 7/30 dias (inclusive dentro de fardos), quantos dias o estoque dura, sugestão de compra em caixas, curva ABC pelo lucro, “Comprar já” e “Parado — não recompre”, e lista de compra por fornecedor para imprimir ou mandar no WhatsApp. **🔥 Espeto hoje** liga/desliga os espetos e combos na venda; venda só de bebida pronta não imprime a via de preparo. “🍺 Exemplos de adega” adiciona cervejas, refrigerantes, energético, água, gelo, carvão e fardos.
- **📋 Cardápio e delivery**: gera o cardápio dos seus produtos (seções automáticas: espetos, cervejas, fardos, doses, destilados, refrigerantes, energéticos, petiscos, conveniência) como imagem A4 em 2 colunas — para enviar ao iFood (“Escolha as imagens do cardápio”), imprimir/PDF ou copiar o texto para o WhatsApp. Cada produto tem descrição, tamanho (ml/kg), seção, preço próprio no app e “vender no iFood/99Food”. “🍻 Adicionar cardápio completo de adega” permite tirar e voltar itens (ex.: acabou a Skol) ou esconder sozinho o que está sem estoque, sem tirar da venda. Cria cervejas (latinha 269 ml, lata 350 ml, latão 473 ml, barrigudinha 300 ml de vidro, long neck, 600 ml, litrão), fardos, doses, destilados e vinhos, refrigerantes, energéticos, gelo, carvão e petiscos com descrição e tamanho. Na venda, os botões **🛵 iFood / 99Food** usam o preço do app (balcão + acréscimo %), marcam para viagem, recebem como “Pago no app” e descontam a comissão do app (Configurações) do lucro; o repasse entra em “Em conta”. Não há integração automática com os apps (exige CNPJ, servidor e homologação deles) — os pedidos que chegam são lançados no PDV.
- **Cupom**: ao confirmar, imprime a **via da churrasqueira** (nº do pedido enorme, PARA VIAGEM em tarja preta, itens, espetos de dentro dos combos e observações em letra grande, quadro “PRA BRASA” com o total por tipo de espeto, sem preços) e a **via do cliente** (preços, pagamento, troco, “não é documento fiscal”). Papel 58 ou 80 mm.
- **Estoque**: a carne entra em **kg** quando chega (“Chegou compra”, com valor pago → custo médio atualizado). Em **“Montar espetos”** você informa quantos espetos saíram e quantos kg usou: baixa os kg, soma os espetos prontos e mostra o rendimento real (g por espeto) com opção de corrigir a ficha. Vendas (inclusive dentro de combos) baixam os espetos prontos; cancelamento devolve. “Contagem” corrige diferenças e registra perdas.
- **Calculadora de montagem**: em Montar espetos, o sistema já sugere quantos espetos dá com a carne em estoque (kg ÷ gramas por espeto). Ajuste os gramas, digite antes quantos mistos quer (o resto da carne vira espeto puro) e confirme. Os gramas escolhidos podem ser guardados na ficha. Cada espeto mostra custo, lucro por unidade e lucro se vender todos, com uma tabela “Comparar pesos” (±10/20 g: quantos espetos dá e o lucro total), e um quadro de projeção (faturamento, custo, lucro e margem da montagem, antes das taxas e despesas do dia).
- **Espeto misto**: produto com ficha de dois insumos (ex.: 60 g de carne + 50 g de linguiça). Em **Montar espetos** você lança carne, linguiça e misto de uma vez e vê quanto de cada carne vai para cada espeto, a sobra e quantos ainda dá para montar com ela. O peso real é dividido entre os espetos na proporção da ficha. O quadro **Para onde foi a carne** (7/30 dias) mostra quantos kg viraram cada espeto.
- **Insumos personalizados**: “+ Novo insumo” cria qualquer insumo (carvão, saquinho grande, pimenta…) com grupo (Carnes, Embalagens, Temperos… ou um seu), unidade, preço de compra e controle de estoque opcional.
- **Saquinho térmico / embalagem para viagem**: em Config → Embalagem para viagem, regras como “1 saquinho por pedido + 1 a cada 10 espetos”. Ao marcar Para viagem, a quantidade sugerida aparece no pedido (ajustável com + e −), o custo entra no lucro, o estoque baixa (e volta se cancelar) e a via da churrasqueira mostra “EMBALAR: 2 SAQUINHO TÉRMICO”.
- **Baião e acompanhamentos**: em Estoque → **Preparei**, lance quantos kg rendeu (e, se quiser, quanto gastou nos ingredientes). O sistema mostra para quantas jantinhas dá (pela porção da ficha, ex.: 250 g), baixa a porção a cada jantinha vendida e bloqueia a jantinha quando o baião acaba.
- **Painel**: faturamento, espetos vendidos (avulsos + em combos), espetos prontos restantes (com alerta de estoque baixo), lucro até agora, totais por forma de pagamento e fila de pedidos (entregue / reimprimir / cancelar).
- **Caixa**: abrir com troco inicial (o estoque da abertura e do fechamento é registrado sozinho); lançar despesas do dia (carvão, gelo…), retiradas e reforços; fechar contando o dinheiro (mostra se sobrou ou faltou).
- **Relatórios**: por caixa (início / entrou / vendido / sobrou de cada espeto) e resumo do mês, com compras de carne/insumos e perdas — quanto em dinheiro, quanto em conta (já sem taxa da maquininha), custo dos produtos, despesas e **lucro**. Pode imprimir na térmica.
- **Cadastros**: insumos (quanto pagou ÷ quanto veio = custo por kg/unidade) e produtos com **ficha técnica** (ex.: 100 g de carne + 1 palito + 3 g de tempero). O custo, lucro por unidade, margem e preço sugerido são calculados sozinhos.

**Lucro** = faturamento − custo dos insumos dos itens vendidos − taxas da maquininha − despesas do dia.

- **🎁 Cortesia / consumo próprio** (Vender): registra itens que saem sem venda (consumo próprio, cortesia, funcionário, degustação ou outro motivo) — baixa o estoque, não entra no caixa nem no faturamento, e o custo sai do lucro; relatórios mostram o custo e quanto valeria, por motivo.
- **🥃 Garrafa vendida em doses**: na compra, “Vou vender em doses” na linha da garrafa transforma a bebida em insumo em litros (garrafas × ml) e cria o produto “Dose de … 100 ml” (ou 50 ml) com custo e lucro por dose; opcionalmente mantém a garrafa fechada à venda, tirando os ml do mesmo estoque.
- **🥖 Espeto no pão** (Cadastros): cria o combo com 1 espeto à escolha + pão francês + vinagrete (insumo “Pão francês” criado se não existir). Preço base = espeto mais barato + R$ 4, e os espetos mais caros pagam a diferença (+R$). Nos combos dá para ajustar o “+R$ a mais por opção”.
- **👥 Dividir na venda**: na tela Vender, “Dividir conta / pagar itens separados” transforma o pedido numa comanda “Balcão” e abre a mesma tela das comandas — pagar tudo, pagar só alguns itens ou dividir igualmente entre pessoas, com os cupons de cada pagamento e da conta completa.
- **🧹 Zerar movimento** (Configurações): depois dos testes, apaga vendas, caixas, comandas, compras/histórico de estoque e zera as quantidades em estoque, mantendo produtos, insumos, preços e configurações. Pede para escrever ZERAR e baixa um backup antes.

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
