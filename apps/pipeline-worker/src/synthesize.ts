import Groq from 'groq-sdk';
import { LLM_MODEL, LlmOutputSchema, type LlmOutput } from '@bytebulletin/shared';

// Canonical prompt — keep in sync with docs/architecture.md §4.
const SYSTEM_PROMPT = `You are a highly analytical technical staff architect filtering and summarizing news for a Senior Full-Stack Software Engineer specializing in the MERN stack, Next.js, distributed databases, cloud engineering, and system design.

Ingest the raw article text provided, analyze its technical substance, and return a single JSON object matching the schema below.

CRITICAL RULES:
1. Return ONLY the raw JSON object — no markdown fences, no wrapper text.
2. If the article has no architectural substance (generic marketing, funding rounds, non-technical corporate news), set category to "General-Tech" and summarize it in exactly one concise sentence with at most one bullet point.
3. "impactAnalysis" must explain the structural trade-off, performance implication, or developer-workflow change this introduces — not restate the headline.

OUTPUT JSON SCHEMA:
{
  "category": "Architecture" | "Frontend-Performance" | "AI-Infrastructure" | "DevOps-Cloud" | "General-Tech",
  "summary": {
    "impactAnalysis": "string",
    "bulletPoints": ["string", "string", "string"]
  }
}`;

/** Minimal surface of the Groq client we use — lets tests inject a fake. */
export interface ChatClient {
  chat: {
    completions: {
      create(params: {
        model: string;
        messages: Array<{ role: 'system' | 'user'; content: string }>;
        response_format: { type: 'json_object' };
        temperature: number;
      }): Promise<{ choices: Array<{ message: { content: string | null } }> }>;
    };
  };
}

export function createGroqClient(apiKey: string): ChatClient {
  return new Groq({ apiKey, maxRetries: 3 });
}

/** Parse + validate raw LLM text. Tolerates accidental ```json fences. Exported for tests. */
export function parseLlmContent(content: string): LlmOutput {
  const stripped = content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/, '');
  return LlmOutputSchema.parse(JSON.parse(stripped));
}

/**
 * One synthesis call; on invalid output, retries once with the validation error
 * appended so the model can self-correct. Throws after the second failure.
 */
export async function synthesize(client: ChatClient, articleText: string): Promise<LlmOutput> {
  const userMessage = `INPUT ARTICLE TEXT:\n---\n${articleText}\n---`;
  let lastError = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await client.chat.completions.create({
      model: LLM_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: attempt === 0
            ? userMessage
            : `${userMessage}\n\nYour previous response was invalid: ${lastError}\nReturn corrected JSON only.`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });
    const content = res.choices[0]?.message.content ?? '';
    try {
      return parseLlmContent(content);
    } catch (err) {
      lastError = err instanceof Error ? err.message.slice(0, 500) : String(err);
    }
  }
  throw new Error(`LLM output invalid after retry: ${lastError}`);
}
