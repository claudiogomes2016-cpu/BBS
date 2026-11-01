# Padrões do Claudio (Logística · Ball BR3R)

Valem para todos os projetos, painéis e relatórios deste usuário.

## 1. Banner sempre estático

- Todo painel/relatório HTML usa o banner padrão Ball Três Rios no **mesmo layout do
  relatório "Logística Informa · Relatório Diário de Vendas"**: card preto com gradiente
  azul-escuro à direita, borda inferior azul `#1F4FFF`, logo Três Rios à esquerda,
  título em Montserrat 900 com a 2ª palavra em azul `#5B84FF`, subtítulo, linha
  "PESSOAS | PROCESSOS | RESULTADOS · PLANTA TRÊS RIOS · BR3R", bloco "REFERÊNCIA" com
  a data à direita e logo Ball.
- **Estático** significa que o banner **fica parado no topo da tela**:
  - sempre visível ao rolar a página (`position: sticky; top: 0`, com fundo da página
    atrás para o conteúdo não aparecer por cima);
  - mesmo layout em qualquer tamanho de janela: tamanho fixo em px, nada de `clamp()`/`vw`,
    e nenhum item do banner some em telas menores (sem media queries no banner);
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

- **Scripts usam a pasta onde estão** (`GetParentFolderName(WScript.ScriptFullName)`),
  nunca caminho fixo: HTML, `dados.js`, `status.js` e `.vbs` vivem na mesma pasta.
- Cada projeto tem um **`Instalar_<projeto>.vbs`** (rodado uma vez) que encerra monitores
  antigos, desativa scripts de pastas antigas, registra os botões do painel (protocolo
  `HKCU\Software\Classes\<proto>`) e cria atalhos (Área de Trabalho + inicialização).
  O painel tem os botões **⚙ Instalar** (diagnóstico), **📁 Pasta SAP**, **🔗 Atalhos SAP**
  e **↻ Atualizar SAP**.
- O script do SAP grava `status.js` (rodando/ok/erro); o painel mostra amarelo → verde
  ("Relatório atualizado com sucesso", também falado em voz pt-BR) ou vermelho com a
  etapa que falhou — nunca `MsgBox` por cima da tela.

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
