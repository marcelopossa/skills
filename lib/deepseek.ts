import { z } from "zod";
import { Area } from "./types";

const ENDPOINT = "https://api.deepseek.com/v1/chat/completions";
const MODEL = "deepseek-chat";

function assertKey(): string {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("DEEPSEEK_API_KEY ausente em .env.local");
  return key;
}

type ChatMessage = { role: "system" | "user"; content: string };

async function chatJson(messages: ChatMessage[]): Promise<unknown> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${assertKey()}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`DeepSeek ${res.status}: ${t.slice(0, 400)}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("DeepSeek devolveu resposta vazia");
  try {
    return JSON.parse(content);
  } catch (e) {
    throw new Error(`DeepSeek JSON inválido: ${content.slice(0, 400)}`);
  }
}

const ClassifyResponseSchema = z.object({
  assigned: z.array(z.string()).default([]),
  propose_new: z
    .array(
      z.object({
        slug: z.string(),
        label: z.string(),
        description: z.string().default(""),
      })
    )
    .default([]),
});
export type ClassifyResponse = z.infer<typeof ClassifyResponseSchema>;

export async function classifySkill(
  skillMarkdown: string,
  existingAreas: Area[]
): Promise<ClassifyResponse> {
  const sys =
    "Você classifica skills de IA em áreas de utilidade. " +
    "IDIOMA OBRIGATÓRIO: TODA saída textual (`label`, `description` das áreas propostas) DEVE estar em **português do Brasil**. Nunca use inglês. " +
    "Responda APENAS JSON válido com as chaves: " +
    "`assigned` (array de slugs de áreas existentes que se aplicam — prefira reusar; máximo 3) e " +
    "`propose_new` (array vazio, ou objetos {slug, label, description} se nenhuma existente servir bem). " +
    "Slugs em kebab-case e em inglês (são identificadores técnicos), mas `label` e `description` SEMPRE em PT-BR. " +
    "Máximo 3 áreas total entre assigned + propose_new. " +
    'Exemplo de formato: {"assigned":["debugging"],"propose_new":[{"slug":"code-review","label":"Revisão de código","description":"Skills para revisão de pull requests e qualidade de código"}]}';
  const user =
    `Áreas existentes:\n${JSON.stringify(existingAreas, null, 2)}\n\n` +
    `Conteúdo da skill (SKILL.md):\n${skillMarkdown.slice(0, 8000)}`;
  const raw = await chatJson([
    { role: "system", content: sys },
    { role: "user", content: user },
  ]);
  return ClassifyResponseSchema.parse(raw);
}

const AnalyzeDepsResponseSchema = z.object({
  referenced_skills: z.array(z.string()).default([]),
  system_requirements: z
    .array(z.object({ tool: z.string(), version: z.string().optional() }))
    .default([]),
  external_files: z.array(z.string()).default([]),
  implicit_deps_notes: z.string().default(""),
});
export type AnalyzeDepsResponse = z.infer<typeof AnalyzeDepsResponseSchema>;

export async function analyzeDeps(skillMarkdown: string): Promise<AnalyzeDepsResponse> {
  const sys =
    "Você analisa dependências de uma skill de IA descrita em markdown. " +
    "IDIOMA OBRIGATÓRIO: o campo `implicit_deps_notes` DEVE estar em português do Brasil. " +
    "Responda APENAS JSON com: " +
    "`referenced_skills` (nomes técnicos de OUTRAS skills mencionadas como complemento ou pré-requisito — manter exatamente como aparecem no texto), " +
    "`system_requirements` (array de {tool, version?} para ferramentas externas como node, gh, python — manter nomes técnicos no original), " +
    "`external_files` (paths relativos fora do diretório da skill, como '../shared/x.sh' — manter paths no original), " +
    "`implicit_deps_notes` (string curta EM PORTUGUÊS DO BRASIL com observações importantes que não cabem nos campos acima). " +
    "Não invente. Se não houver, deixe vazio.";
  const raw = await chatJson([
    { role: "system", content: sys },
    { role: "user", content: skillMarkdown.slice(0, 12000) },
  ]);
  return AnalyzeDepsResponseSchema.parse(raw);
}

const RefineDescriptionSchema = z.object({
  suggested_description: z.string(),
});

export async function refineDescription(
  skillMarkdown: string,
  currentDescription: string
): Promise<{ suggested_description: string }> {
  const sys =
    "Sua tarefa: gerar uma descrição curta para uma skill de IA. " +
    "IDIOMA OBRIGATÓRIO: **português do Brasil**. Mesmo que o SKILL.md esteja em inglês, traduza e sintetize em PT-BR. " +
    "Nunca devolva em inglês — se o texto original está em inglês, traduza para PT-BR. " +
    "Formato: 1 a 2 frases, máximo 160 caracteres, tom direto e objetivo, foco no que a skill faz e quando usar. " +
    "Não copie literalmente o texto original — reescreva de forma fluida em PT-BR. " +
    "Responda APENAS JSON com a chave `suggested_description`. " +
    'Exemplo: {"suggested_description":"Loop disciplinado de diagnóstico para bugs difíceis e regressões de performance: reproduzir, minimizar, hipotetizar, instrumentar, corrigir."}';
  const user = `Descrição atual (pode estar em inglês ou vazia): ${currentDescription || "(vazia)"}\n\nConteúdo do SKILL.md:\n${skillMarkdown.slice(0, 8000)}\n\nGere a descrição em PORTUGUÊS DO BRASIL.`;
  const raw = await chatJson([
    { role: "system", content: sys },
    { role: "user", content: user },
  ]);
  return RefineDescriptionSchema.parse(raw);
}
