import { config } from 'dotenv';
import { resolve } from 'path';
import { invokeLLM } from '../server/_core/llm';

// Load env just like the dev server
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

async function main() {
  const query = 'teracell kućne punjače';

  // Simulate a bigger candidate list (similar to real catalog usage)
  const candidates = Array.from({ length: 60 }).map((_, i) => ({
    index: i,
    name: `Kućni punjač Teracell model ${i + 1}`,
    code: `TC-${i + 1}`,
    category: i % 2 === 0 ? 'Punjači za mob. tel.' : 'Punjači za auto',
    brand: 'Teracell',
  }));

  const candidateList = candidates
    .map((c) => {
      const parts = [
        `index:${c.index}`,
        `name:"${c.name}"`,
        `brand:"${c.brand}"`,
        `category:"${c.category}"`,
        `code:${c.code}`,
      ];
      return `{${parts.join(', ')}}`;
    })
    .join('\n');

  const maxSelect = 0;
  const maxNote =
    maxSelect > 0 ? ` Return at most ${maxSelect} indices.` : '';

  const systemPrompt = `You are a product selection assistant for a retail advertising tool.

Given a user search query and a list of product candidates from a catalog, select which candidates match the query.

IMPORTANT rules:
- Be INCLUSIVE with vocabulary: treat synonyms and equivalent terms as matches.
  Examples: "USB-C" = "Type-C" = "USB Type-C"; "punjač" = "charger"; "futrola" = "case" = "cover"
- Match by INTENT: if user asks for "auto punjači", include ALL chargers designed for cars
- Match partial queries: if user asks for "Hoco punjači", include all Hoco brand chargers
- A product MATCHES if it fits the query's category AND any specified brand/model/term
- A product does NOT match if it's clearly in a different category (e.g. a cable is not a charger)
- If no candidates match, return empty indices${maxNote}

Reply with ONLY valid JSON: {"indices":[<list of matching index values>],"reasoning":"<1 sentence>"}`;

  const userPrompt = `Query: "${query.trim()}"\n\nCandidates:\n${candidateList}`;

  // eslint-disable-next-line no-console
  console.log('--- SYSTEM PROMPT ---\n', systemPrompt);
  // eslint-disable-next-line no-console
  console.log(
    '\n--- USER PROMPT (truncated to 1200 chars) ---\n',
    userPrompt.slice(0, 1200),
  );

  const response = await invokeLLM({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    maxTokens: 400,
    // No response_format: keep request compatible with io.net docs
  });

  const content = response.choices[0]?.message?.content;

  // eslint-disable-next-line no-console
  console.log(
    '\n--- RAW LLM CONTENT (first 1200 chars) ---\n',
    typeof content === 'string' ? content.slice(0, 1200) : content,
  );

  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content) as {
        indices?: unknown;
        reasoning?: string;
      };
      // eslint-disable-next-line no-console
      console.log('\n--- PARSED JSON ---\n', parsed);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        '\n--- JSON.parse FAILED ---\n',
        (err as Error).message,
      );
    }
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('debug-selectProducts-llm failed:', err);
  process.exit(1);
});

