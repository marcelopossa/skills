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

- **`anthropics-knowledge-work-plugins-engineering`** — Otimize fluxos de engenharia — standups, revisão de código, decisões de arquitetura, resposta a incidentes e documentação técnica. Funciona com ferramentas existentes ou de forma independente.

### Design de interface

_Habilidade para projetar múltiplas interfaces de módulo radicalmente diferentes, comparar trade-offs e sintetizar a melhor abordagem, baseada em princípios de design de software._

- **`nextlevelbuilder-ui-ux-pro-max`** — Inteligência profissional de UI/UX para assistentes de IA: estilos, paletas, tipografia, gráficos e diretrizes para React, Next.js, Vue, Svelte, SwiftUI, Flutter, Tailwind e mais.

### Documentação de handoff

_Habilidade para criar documentos de handoff concisos que resumem o estado atual da conversa, referenciam artefatos existentes e sugerem skills para o próximo agente, com redação de informações sensíveis._

- **`anthropics-knowledge-work-plugins-engineering`** — Otimize fluxos de engenharia — standups, revisão de código, decisões de arquitetura, resposta a incidentes e documentação técnica. Funciona com ferramentas existentes ou de forma independente.

### Revisão de código

_Habilidade para revisar mudanças em código-fonte, verificando conformidade com padrões e especificações, e reportando achados de forma estruturada._

- **`anthropics-knowledge-work-plugins-engineering`** — Otimize fluxos de engenharia — standups, revisão de código, decisões de arquitetura, resposta a incidentes e documentação técnica. Funciona com ferramentas existentes ou de forma independente.
- **`anthropics-knowledge-work-plugins-legal`** — Acelere revisão de contratos, triagem de NDAs e conformidade para equipes jurídicas internas. Redija briefings legais, organize pesquisa de precedentes e gerencie conhecimento institucional.

### Estilização de marca

_Habilidade para aplicar diretrizes visuais de marca (cores, tipografia, logotipos) a artefatos, garantindo consistência com a identidade corporativa._

- **`nextlevelbuilder-ui-ux-pro-max`** — Inteligência profissional de UI/UX para assistentes de IA: estilos, paletas, tipografia, gráficos e diretrizes para React, Next.js, Vue, Svelte, SwiftUI, Flutter, Tailwind e mais.

### Aplicação de temas

_Habilidade para aplicar temas visuais predefinidos ou personalizados a artefatos como slides, documentos e landing pages, incluindo seleção de paletas de cores e fontes, e geração de novos temas sob demanda._

- **`nextlevelbuilder-ui-ux-pro-max`** — Inteligência profissional de UI/UX para assistentes de IA: estilos, paletas, tipografia, gráficos e diretrizes para React, Next.js, Vue, Svelte, SwiftUI, Flutter, Tailwind e mais.

### Análise de dados

_Habilidade para responder perguntas sobre dados, desde consultas rápidas até análises completas e relatórios formais, incluindo exploração de dados, escrita de SQL e criação de visualizações._

- **`anthropics-knowledge-work-plugins-data`** — Escreva SQL, explore dados e gere insights rapidamente. Crie visualizações e dashboards para transformar dados brutos em histórias claras para stakeholders.

### Fluxo de trabalho financeiro

_Habilidade para gerenciar workflows financeiros e contábeis, incluindo lançamentos contábeis, reconciliação, fechamento de mês, demonstrações financeiras e suporte a auditoria SOX._

- **`anthropics-knowledge-work-plugins-finance`** — Automatiza fluxos financeiros e contábeis: lançamentos, conciliação, demonstrações, análise de variações, fechamento mensal e preparação para auditoria.

### Fluxo de trabalho jurídico

_Habilidade para gerenciar fluxos de trabalho jurídicos internos, incluindo revisão de contratos, verificação de conformidade, avaliação de riscos legais e preparação de briefings para reuniões._

- **`anthropics-knowledge-work-plugins-legal`** — Acelere revisão de contratos, triagem de NDAs e conformidade para equipes jurídicas internas. Redija briefings legais, organize pesquisa de precedentes e gerencie conhecimento institucional.

### Gestão de campanhas de marketing

_Habilidade para planejar, executar e analisar campanhas de marketing multicanal, incluindo criação de briefings, calendários de conteúdo, sequências de e-mail e relatórios de desempenho._

- **`anthropics-knowledge-work-plugins-marketing`** — Crie conteúdo, planeje campanhas e analise o desempenho em canais de marketing, mantendo a consistência da marca e monitorando concorrentes.

### Sem área atribuída

- **`mattpocock-write-a-skill`** — Cria novas skills de IA com estrutura adequada, divulgação progressiva e recursos agrupados. Use quando o usuário quiser criar, escrever ou construir uma nova skill.
- **`mattpocock-tdd`** — Desenvolvimento orientado a testes com ciclo red-green-refactor. Use quando quiser construir funcionalidades ou corrigir bugs seguindo TDD.
- **`mattpocock-improve-codebase-architecture`** — Encontre oportunidades de aprofundamento na arquitetura do código, guiado pela linguagem de domínio em CONTEXT.md e decisões em docs/adr/. Use para melhorar a arquitetura, refatorar, consolidar módulos acoplados ou tornar o código mais testável e navegável por IA.
- **`mattpocock-grill-with-docs`** — Sessão de questionamento que desafia seu plano contra o modelo de domínio existente, afina a terminologia e atualiza a documentação (CONTEXT.md, ADRs) à medida que as decisões se cristalizam. Use quando quiser testar um plano contra a linguagem e decisões documentadas do projeto.
- **`mattpocock-grill-me`** — Entrevista implacável sobre um plano ou design, explorando cada ramo da árvore de decisão até o entendimento compartilhado. Use para testar um plano ou quando mencionar 'me grille'.
- **`mattpocock-diagnose`** — Loop disciplinado de diagnóstico para bugs difíceis e regressões de performance: reproduzir, minimizar, hipotetizar, instrumentar, corrigir. Use quando o usuário disser 'diagnostique isso' ou relatar um bug.
- **`mattpocock-caveman`** — Modo de comunicação ultracompacto que reduz uso de tokens em ~75% ao eliminar rodeios, mantendo precisão técnica. Ative com 'caveman mode' ou '/caveman'.

Instale individualmente: `/plugin install <nome>@marcelopossa-skills`. Habilite/desabilite por sessão com `/plugin enable <nome>` e `/plugin disable <nome>`.
<!-- AUTO:SKILLS:END -->

## Credits & Licenses

Skills aqui foram curadas a partir das fontes abaixo. Atribuição e licença são preservadas; `NOTICE.md` em cada pasta de fonte traz o LICENSE original.

<!-- AUTO:CREDITS:START -->
### [anthropics/skills](https://github.com/anthropics/skills)

- **Licença:** UNKNOWN
- **Skills curadas:** _nenhuma ainda_
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

- **Licença:** Apache-2.0 ([LICENSE](https://github.com/anthropics/knowledge-work-plugins/blob/main/LICENSE))
- **Skills curadas:** `data`, `engineering`, `finance`, `legal`, `marketing`
- **Agradecimento:** Skills originalmente criadas por anthropics (https://github.com/anthropics).

### [czlonkowski/n8n-skills](https://github.com/czlonkowski/n8n-skills)

- **Licença:** UNKNOWN
- **Skills curadas:** _nenhuma ainda_
- **Agradecimento:** Skills originalmente criadas por czlonkowski (https://github.com/czlonkowski).

### [mattpocock/skills](https://github.com/mattpocock/skills)

- **Licença:** MIT ([LICENSE](https://github.com/mattpocock/skills/blob/main/LICENSE))
- **Skills curadas:** `caveman`, `diagnose`, `grill-me`, `grill-with-docs`, `improve-codebase-architecture`, `tdd`, `write-a-skill`
- **Agradecimento:** Skills originalmente criadas por mattpocock (https://github.com/mattpocock).

### [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)

- **Licença:** MIT ([LICENSE](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/LICENSE))
- **Skills curadas:** `ui-ux-pro-max`
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
