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
### Sem área atribuída

- **diagnose** (mattpocock) — Disciplined diagnosis loop for hard bugs and performance regressions. Reproduce → minimise → hypothesise → instrument → fix → regression-test. Use when user says "diagnose this" / "debug this", reports a bug, says something is broken/throwing/failing, or describes a performance regression.
- **tdd** (mattpocock) — Test-driven development with red-green-refactor loop. Use when user wants to build features or fix bugs using TDD, mentions "red-green-refactor", wants integration tests, or asks for test-first development.
<!-- AUTO:SKILLS:END -->

## Credits & Licenses

Skills aqui foram curadas a partir das fontes abaixo. Atribuição e licença são preservadas; `NOTICE.md` em cada pasta de fonte traz o LICENSE original.

<!-- AUTO:CREDITS:START -->
### [mattpocock/skills](https://github.com/mattpocock/skills)

- **Licença:** MIT ([LICENSE](https://github.com/mattpocock/skills/blob/main/LICENSE))
- **Skills curadas:** `diagnose`, `tdd`
- **Agradecimento:** Skills originalmente criadas por mattpocock (https://github.com/mattpocock).
<!-- AUTO:CREDITS:END -->
