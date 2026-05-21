# marcelopossa-skills

Marketplace pessoal de skills curadas de outros repositórios do GitHub, mantido por Marcelo Possa.

**Como funciona.** Skills aqui são importadas de fontes externas e mantidas em modo **read-only** — nunca edito manualmente. Quando o upstream muda, sincronizo localmente pelo painel web e republico para o GitHub.

## Como instalar — Claude Code, Claude Cowork ou extensão Claude no VSCode

```
/plugin marketplace add marcelopossa/skills
/plugin install marcelopossa-skills@marcelopossa/skills
```

O mesmo `.claude-plugin/plugin.json` funciona nos três clientes.

## Curadoria local

Para gerenciar fontes e selecionar skills:

```bash
npm install
cp .env.example .env.local   # preencher DEEPSEEK_API_KEY (e GITHUB_TOKEN opcional)
npm run dev                  # abrir http://localhost:3000
```

## Skills

<!-- AUTO:SKILLS:START -->
### Debugging

_Systematic diagnosis and resolution of software defects, including reproduction, minimization, hypothesis testing, and instrumentation._

- **`anthropics-pdf`** — Skill para manipular arquivos PDF: ler, extrair texto/tabelas, mesclar, dividir, rotacionar, adicionar marca d'água, criar, preencher formulários, criptografar/descriptografar, extrair imagens e aplicar OCR.
- **`anthropics-webapp-testing`** — Ferramenta para testar e interagir com aplicações web locais usando Playwright: verifica funcionalidades, depura UI, captura screenshots e visualiza logs do navegador.

### Prototipação

_Habilidade para construir protótipos descartáveis que respondem a perguntas de design, seja via terminal para lógica/estado ou múltiplas variações de UI, seguindo regras de descartabilidade e foco em aprendizado rápido._

- **`anthropics-web-artifacts-builder`** — Ferramentas para criar artefatos HTML complexos com React, Tailwind CSS e shadcn/ui. Use para componentes com estado, roteamento ou shadcn/ui, não para HTML/JSX simples.

### Manipulação de documentos Word

_Habilidade para criar, ler, editar e analisar arquivos .docx, incluindo formatação avançada, tabelas, imagens, controle de alterações e conversão entre formatos._

- **`anthropics-docx`** — Cria, edita e analisa documentos Word (.docx) com formatação profissional, como sumários, cabeçalhos e numeração de páginas. Use para relatórios, memorandos, cartas ou qualquer manipulação de arquivos .docx.
- **`anthropics-xlsx`** — Crie, edite ou analise arquivos de planilha (.xlsx, .csv, etc.) com fórmulas dinâmicas e formatação profissional. Ideal para manipular dados tabulares, gerar relatórios financeiros ou limpar dados bagunçados.

### Processamento de PDF

_Habilidade para realizar operações com arquivos PDF, incluindo leitura, extração de texto/tabelas, mesclagem, divisão, rotação, criação, preenchimento de formulários, criptografia, OCR e extração de imagens, usando bibliotecas Python e ferramentas de linha de comando._

- **`anthropics-pdf`** — Skill para manipular arquivos PDF: ler, extrair texto/tabelas, mesclar, dividir, rotacionar, adicionar marca d'água, criar, preencher formulários, criptografar/descriptografar, extrair imagens e aplicar OCR.
- **`anthropics-pptx`** — Use esta skill sempre que um arquivo .pptx estiver envolvido — para criar, ler, editar, extrair texto ou combinar slides. Ative quando o usuário mencionar 'deck', 'slides', 'apresentação' ou um nome de arquivo .pptx.
- **`anthropics-xlsx`** — Crie, edite ou analise arquivos de planilha (.xlsx, .csv, etc.) com fórmulas dinâmicas e formatação profissional. Ideal para manipular dados tabulares, gerar relatórios financeiros ou limpar dados bagunçados.

### Manipulação de apresentações PPTX

_Habilidade para criar, ler, editar e analisar arquivos .pptx, incluindo formatação avançada, slides, layouts, notas do apresentador, comentários, extração de texto, mesclagem, divisão e uso de templates._

- **`anthropics-pptx`** — Use esta skill sempre que um arquivo .pptx estiver envolvido — para criar, ler, editar, extrair texto ou combinar slides. Ative quando o usuário mencionar 'deck', 'slides', 'apresentação' ou um nome de arquivo .pptx.
- **`anthropics-xlsx`** — Crie, edite ou analise arquivos de planilha (.xlsx, .csv, etc.) com fórmulas dinâmicas e formatação profissional. Ideal para manipular dados tabulares, gerar relatórios financeiros ou limpar dados bagunçados.

Instale individualmente: `/plugin install <nome>@marcelopossa-skills`. Habilite/desabilite por sessão com `/plugin enable <nome>` e `/plugin disable <nome>`.
<!-- AUTO:SKILLS:END -->

## Credits & Licenses

Skills aqui foram curadas a partir das fontes abaixo. Atribuição e licença são preservadas; `NOTICE.md` em cada pasta de fonte traz o LICENSE original.

<!-- AUTO:CREDITS:START -->
### [anthropics/skills](https://github.com/anthropics/skills)

- **Licença:** UNKNOWN
- **Skills curadas:** `docx`, `pdf`, `pptx`, `web-artifacts-builder`, `webapp-testing`, `xlsx`
- **Agradecimento:** Skills originalmente criadas por anthropics (https://github.com/anthropics).

### [anthropics/claude-for-legal](https://github.com/anthropics/claude-for-legal)

- **Licença:** UNKNOWN
- **Skills curadas:** _nenhuma ainda_
- **Agradecimento:** Skills originalmente criadas por anthropics (https://github.com/anthropics).

### [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official)

- **Licença:** UNKNOWN
- **Skills curadas:** _nenhuma ainda_
- **Agradecimento:** Skills originalmente criadas por anthropics (https://github.com/anthropics).

### [anthropics/financial-services](https://github.com/anthropics/financial-services)

- **Licença:** UNKNOWN
- **Skills curadas:** _nenhuma ainda_
- **Agradecimento:** Skills originalmente criadas por anthropics (https://github.com/anthropics).

### [anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins)

- **Licença:** UNKNOWN
- **Skills curadas:** _nenhuma ainda_
- **Agradecimento:** Skills originalmente criadas por anthropics (https://github.com/anthropics).

### [czlonkowski/n8n-skills](https://github.com/czlonkowski/n8n-skills)

- **Licença:** UNKNOWN
- **Skills curadas:** _nenhuma ainda_
- **Agradecimento:** Skills originalmente criadas por czlonkowski (https://github.com/czlonkowski).

### [mattpocock/skills](https://github.com/mattpocock/skills)

- **Licença:** MIT ([LICENSE](https://github.com/mattpocock/skills/blob/main/LICENSE))
- **Skills curadas:** _nenhuma ainda_
- **Agradecimento:** Skills originalmente criadas por mattpocock (https://github.com/mattpocock).

### [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)

- **Licença:** UNKNOWN
- **Skills curadas:** _nenhuma ainda_
- **Agradecimento:** Skills originalmente criadas por nextlevelbuilder (https://github.com/nextlevelbuilder).

### [obra/superpowers-marketplace](https://github.com/obra/superpowers-marketplace)

- **Licença:** UNKNOWN
- **Skills curadas:** _nenhuma ainda_
- **Agradecimento:** Skills originalmente criadas por obra (https://github.com/obra).

### [thedotmack/claude-mem](https://github.com/thedotmack/claude-mem)

- **Licença:** UNKNOWN
- **Skills curadas:** _nenhuma ainda_
- **Agradecimento:** Skills originalmente criadas por thedotmack (https://github.com/thedotmack).
<!-- AUTO:CREDITS:END -->
