import OpenAI from 'openai';
import { I18nJson, FigmaTextNode } from '../types';

/**
 * Extract all keys from a nested JSON object
 */
export function extractAllKeys(obj: I18nJson, prefix: string = ''): string[] {
  const keys: string[] = [];

  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      // Recursively extract keys from nested objects
      keys.push(...extractAllKeys(obj[key] as I18nJson, fullKey));
    } else {
      // This is a leaf key
      keys.push(fullKey);
    }
  }

  return keys;
}

export function buildPrompt(
  nodes: FigmaTextNode[],
  contextSample: string,
  existingKeys: string[] = []
): string {
  const textsInfo = nodes.map((node, idx) => {
    return `${idx + 1}. Frame: "${node.frameName}" (Path: ${node.framePath.join(' > ')})\n   Text: "${node.text}"`;
  }).join('\n\n');

  const existingKeysInfo = existingKeys.length > 0
    ? `\n\nEXISTING KEYS (DO NOT USE THESE):\n${existingKeys.join(', ')}\n\nGenerate DIFFERENT keys that don't conflict with the existing ones above.`
    : '';

  return `You are generating i18n keys for a Japanese UI based on a Figma file.
Follow this key style example from the existing JSON structure:

${contextSample}

Naming Rules:
- Use SHORT, FLAT keys with format: "screen_type" or "screen_type_detail"
- Keep keys concise (2-3 parts max, separated by underscores)
- Common patterns:
  - "contact_title" - page/form title
  - "contact_email" - email field label
  - "contact_category" - category field label
  - "contact_submit" - submit button
  - "menu_housewife" - menu option
  - "savings_desc" - description text
- Component types: title, label, button, desc, body, placeholder, error, hint
- Avoid redundancy: "contactForm_label_email" → "contact_email"
- Use the frame path to understand screen context
- Make keys unique - never repeat the same key

Given the following Japanese texts from Figma:

${textsInfo}

Generate SHORT, FLAT i18n keys (no nested objects). Each key MUST be unique.${existingKeysInfo}
Return ONLY valid JSON, no explanation or extra text.

Expected format:
{
  "contact_title": "日本語テキスト",
  "contact_email": "日本語テキスト"
}`;
}

export async function generateKeys(
  nodes: FigmaTextNode[],
  contextSample: string,
  apiKey: string
): Promise<I18nJson> {
  const openai = new OpenAI({ apiKey });

  const prompt = buildPrompt(nodes, contextSample);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant that generates i18n keys for Japanese text. You always respond with valid JSON only.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No response from OpenAI');
  }

  try {
    return JSON.parse(content) as I18nJson;
  } catch (error) {
    console.error('Failed to parse OpenAI response:', content);
    throw new Error('Invalid JSON response from OpenAI');
  }
}

export async function generateKeysInBatches(
  nodes: FigmaTextNode[],
  contextSample: string,
  apiKey: string,
  existingKeys: string[] = [],
  batchSize: number = 10
): Promise<{
  generatedKeys: I18nJson;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}> {
  const batches: FigmaTextNode[][] = [];

  // Split into batches
  for (let i = 0; i < nodes.length; i += batchSize) {
    batches.push(nodes.slice(i, i + batchSize));
  }

  // Process batches sequentially
  const results: I18nJson[] = [];
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let totalTokens = 0;

  const openai = new OpenAI({ apiKey });

  // Track all keys generated so far (including existing keys)
  const allGeneratedKeys = new Set<string>(existingKeys);

  for (const batch of batches) {
    const prompt = buildPrompt(batch, contextSample, Array.from(allGeneratedKeys));

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that generates i18n keys for Japanese text. You always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Track token usage
    if (response.usage) {
      totalPromptTokens += response.usage.prompt_tokens;
      totalCompletionTokens += response.usage.completion_tokens;
      totalTokens += response.usage.total_tokens;
    }

    try {
      const parsed = JSON.parse(content) as I18nJson;

      // Add new keys to the tracking set
      Object.keys(parsed).forEach(key => allGeneratedKeys.add(key));

      results.push(parsed);
    } catch (error) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Invalid JSON response from OpenAI');
    }
  }

  // Merge all results
  const generatedKeys = results.reduce((acc, curr) => {
    return { ...acc, ...curr };
  }, {});

  return {
    generatedKeys,
    tokenUsage: {
      promptTokens: totalPromptTokens,
      completionTokens: totalCompletionTokens,
      totalTokens,
    },
  };
}
