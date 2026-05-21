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
    "Você classifica skills de IA em áreas de utilidade. Responda APENAS JSON válido com chaves: " +
    '`assigned` (array de slugs de áreas existentes que se aplicam, prefira reusar; máximo 3) e ' +
    '`propose_new` (array vazio, ou objetos {slug, label, description} caso nenhuma existente sirva bem). ' +
    "Use kebab-case para slugs. Máximo 3 áreas total entre assigned + propose_new.";
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
    "Você analisa dependências de uma skill de IA descrita em markdown. Responda APENAS JSON com: " +
    "`referenced_skills` (nomes de OUTRAS skills mencionadas como complemento ou pré-requisito), " +
    "`system_requirements` (array de {tool, version?} para ferramentas externas como node, gh, python — só se mencionado), " +
    "`external_files` (paths relativos fora do diretório da skill, como '../shared/x.sh'), " +
    "`implicit_deps_notes` (string curta com observações importantes que não cabem nos campos acima). " +
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
    "Gere uma descrição curta (1-2 frases, máximo 160 caracteres) em português brasileiro " +
    "para a skill descrita. Responda APENAS JSON com a chave `suggested_description`.";
  const user = `Descrição atual: ${currentDescription || "(vazia)"}\n\nSKILL.md:\n${skillMarkdown.slice(0, 8000)}`;
  const raw = await chatJson([
    { role: "system", content: sys },
    { role: "user", content: user },
  ]);
  return RefineDescriptionSchema.parse(raw);
}
