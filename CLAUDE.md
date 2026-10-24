# Padrões do Claudio (Logística · Ball BR3R)

Valem para todos os projetos, painéis e relatórios deste usuário.

## 1. Banner sempre estático

- Todo painel/relatório HTML usa o banner padrão Ball Três Rios no **mesmo layout do
  relatório "Logística Informa · Relatório Diário de Vendas"**: card preto com gradiente
  azul-escuro à direita, borda inferior azul `#1F4FFF`, logo Três Rios à esquerda,
  título em Montserrat 900 com a 2ª palavra em azul `#5B84FF`, subtítulo, linha
  "PESSOAS | PROCESSOS | RESULTADOS · PLANTA TRÊS RIOS · BR3R", bloco "REFERÊNCIA" com
  a data à direita e logo Ball.
- **Estático** significa:
  - tamanho fixo em px (nada de `clamp()`/`vw` que muda com a largura da tela);
  - `position: static` — não é sticky/fixed, não acompanha a rolagem;
  - sem animação.
- Resto da página no mesmo padrão: fundo claro `#E9EDF3`, cards brancos com faixa
  colorida no topo, ícone em quadrado colorido, números grandes, rótulos em
  JetBrains Mono caixa-alta, rodapé "Fontes: …" / "BALL BR3R · LOGÍSTICA".
- **Cards clicáveis sempre filtram a tabela abaixo deles, na mesma página**
  (cada card mostra os itens que compõem o seu número).

## 2. Exportações do SAP sempre fecham

Todo script que extrai planilhas do SAP (MB52, VL10D, ZTSD…, etc.) deve:

- **Fechar o arquivo no Excel logo depois de salvar** — o SAP abre o Excel sozinho.
  Vigiar por ~20 s após o "Salvar" e fechar sem salvar, cobrindo:
  - pasta aberta no Excel principal (`GetObject(, "Excel.Application")`);
  - Modo de Exibição Protegida (`ProtectedViewWindows`, comum no OneDrive);
  - Excel separado aberto pelo SAP (processo `EXCEL.EXE` com o arquivo na linha
    de comando → encerrar);
  - encerrar o Excel se ficar sem pastas visíveis.
- **Nunca cobrir o painel HTML**: SAP roda minimizado (`iconify`, não `maximize`);
  no fim, trazer a janela do painel de volta para a frente (`AppActivate` pelo título).
- **Nunca regravar nem abrir o HTML** durante a extração. O HTML lê um `dados.js`
  gravado de forma atômica (`.tmp` + renomear) e se recarrega sozinho.
- Fechar o arquivo no Excel **antes** de exportar também (arquivo aberto impede o SAP
  de substituir).

## Detalhes técnicos já resolvidos

- Arquivo "Planilha" do SAP (`.xls` em texto, separado por tabulação) **não** deve ser
  aberto pelo Excel via automação: ele usa padrão americano e transforma `18,672` em
  `18672`. Ler o texto cru e interpretar em pt-BR (ponto = milhar, vírgula = decimal).
  Se abrir xlsx pelo Excel, usar `Local:=True`.
- Quantidades em **MI = milheiro** (ex.: `1.985,067 MI` = 1.985.067 latas).
- Scripts `.vbs` em ASCII com CRLF; caminhos com acento montados com `ChrW()`
  (ex.: pasta `Projeção Trânsferência`).
- Ao reiniciar um monitor VBS, a instância nova encerra a antiga (senão a versão
  nova nunca entra em vigor).
