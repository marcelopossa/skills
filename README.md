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

- **`mattpocock-diagnose`** — Loop disciplinado de diagnóstico para bugs difíceis e regressões de performance: reproduzir, minimizar, hipotetizar, instrumentar, corrigir.

### Sem área atribuída

- **`mattpocock-tdd`** — Desenvolvimento orientado a testes com ciclo red-green-refactor. Use para construir funcionalidades ou corrigir bugs com TDD, quando mencionar 'red-green-refactor', quiser testes de integração ou desenvolvimento test-first.
- **`mattpocock-grill-me`** — Entrevista implacável sobre planos ou designs, explorando cada ramo da árvore de decisão até o entendimento compartilhado. Use para testar um plano sob pressão ou quando mencionar 'me avalie'.
- **`mattpocock-grill-with-docs`** — Sessão de questionamento que desafia seu plano contra o modelo de domínio existente, afina a terminologia e atualiza a documentação (CONTEXT.md, ADRs) à medida que as decisões se cristalizam. Use quando quiser testar um plano contra a linguagem e decisões documentadas do projeto.
- **`mattpocock-handoff`** — Compacta a conversa atual em um documento de handoff para outro agente continuar o trabalho, salvando no diretório temporário do sistema.
- **`mattpocock-improve-codebase-architecture`** — Encontre oportunidades de aprofundamento na arquitetura do código, guiado pela linguagem de domínio em CONTEXT.md e decisões em docs/adr/. Use para melhorar a arquitetura, refatorar, consolidar módulos acoplados ou tornar o código mais testável e navegável por IA.
- **`mattpocock-obsidian-vault`** — Pesquise, crie e gerencie notas no vault Obsidian com wikilinks e notas índice. Use para encontrar, criar ou organizar notas.

Instale individualmente: `/plugin install <nome>@marcelopossa-skills`. Habilite/desabilite por sessão com `/plugin enable <nome>` e `/plugin disable <nome>`.
<!-- AUTO:SKILLS:END -->

## Credits & Licenses

Skills aqui foram curadas a partir das fontes abaixo. Atribuição e licença são preservadas; `NOTICE.md` em cada pasta de fonte traz o LICENSE original.

<!-- AUTO:CREDITS:START -->
### [anthropics/skills](https://github.com/anthropics/skills)

- **Licença:** UNKNOWN
- **Skills curadas:** _nenhuma ainda_
- **Agradecimento:** Skills originalmente criadas por anthropics (https://github.com/anthropics).

### [mattpocock/skills](https://github.com/mattpocock/skills)

- **Licença:** MIT ([LICENSE](https://github.com/mattpocock/skills/blob/main/LICENSE))
- **Skills curadas:** `diagnose`, `grill-me`, `grill-with-docs`, `handoff`, `improve-codebase-architecture`, `obsidian-vault`, `tdd`
- **Agradecimento:** Skills originalmente criadas por mattpocock (https://github.com/mattpocock).
<!-- AUTO:CREDITS:END -->
