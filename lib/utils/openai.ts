import OpenAI from "openai";
import { I18nJson, FigmaTextNode } from "../types";

/**
 * Extract all keys from a nested JSON object
 */
export function extractAllKeys(obj: I18nJson, prefix: string = ""): string[] {
  const keys: string[] = [];

  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (
      typeof obj[key] === "object" &&
      obj[key] !== null &&
      !Array.isArray(obj[key])
    ) {
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
  useNestedKeys: boolean = false
): string {
  const textsInfo = nodes
    .map((node, idx) => {
      return `${idx + 1}. Frame: "${
        node.frameName
      }" (Path: ${node.framePath.join(" > ")})\n   Text: "${node.text}"`;
    })
    .join("\n\n");

  if (useNestedKeys) {
    return `You are generating i18n keys for a Japanese UI based on a Figma file.
Follow this key style example:

${contextSample}

Naming Rules for NESTED structure:
- Group keys by screen/frame name from the frame path
- Use the first meaningful frame name as the top-level key in PascalCase (e.g., "DashboardNavigation", "DepositDetailsModal", "Discover")
- Under each screen, create descriptive keys for the text elements in snake_case
- Element keys should be short and descriptive (e.g., "home", "insurance", "atm_title", "branch_name")
- You can create nested sub-groups when needed (e.g., "merchandise_tab" under "DashboardNavigation")
- Common element types: title, subtitle, description, button, label, placeholder, error, hint, tab

Given the following Japanese texts from Figma:

${textsInfo}

Generate NESTED i18n keys grouped by screen name. Each key MUST be unique within its screen.
Return ONLY valid JSON, no explanation or extra text.

Expected format:
{
  "ScreenName": {
    "key": "日本語テキスト",
    "another_key": "日本語テキスト",
    "nested_group": {
      "sub_key": "日本語テキスト"
    }
  }
}`;
  }

  return `You are generating i18n keys for a Japanese UI based on a Figma file.
Follow this key style example:

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

Generate SHORT, FLAT i18n keys (no nested objects). Each key MUST be unique.
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
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a helpful assistant that generates i18n keys for Japanese text. You always respond with valid JSON only.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("No response from OpenAI");
  }

  try {
    return JSON.parse(content) as I18nJson;
  } catch {
    console.error("Failed to parse OpenAI response:", content);
    throw new Error("Invalid JSON response from OpenAI");
  }
}

/**
 * Find duplicate keys between generated keys and existing keys
 */
function findDuplicateKeys(
  generated: I18nJson,
  existingKeys: string[]
): string[] {
  const generatedKeysList = extractAllKeys(generated);
  const duplicates: string[] = [];

  for (const key of generatedKeysList) {
    if (existingKeys.includes(key)) {
      duplicates.push(key);
    }
  }

  return duplicates;
}

/**
 * Create a node list for regenerating specific keys
 */
function createNodesForRegeneration(
  originalNodes: FigmaTextNode[],
  generatedKeys: I18nJson,
  duplicateKeys: string[]
): FigmaTextNode[] {
  const nodesToRegenerate: FigmaTextNode[] = [];

  // Find which nodes correspond to the duplicate keys
  for (const duplicateKey of duplicateKeys) {
    // Get the value for this duplicate key
    const parts = duplicateKey.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = generatedKeys;

    for (const part of parts) {
      current = current[part];
    }

    const value = typeof current === 'string' ? current : '';

    // Find the node with this value
    const node = originalNodes.find(n => n.text === value);
    if (node) {
      nodesToRegenerate.push(node);
    }
  }

  return nodesToRegenerate;
}

export async function generateKeysInBatches(
  nodes: FigmaTextNode[],
  contextSample: string,
  apiKey: string,
  existingKeys: string[] = [],
  batchSize: number = 10,
  useNestedKeys: boolean = false
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

  // Track all keys (start with existing keys for duplicate checking)
  const allExistingKeys = new Set<string>(existingKeys);

  for (const batch of batches) {
    // Generate keys WITHOUT sending existing keys in prompt
    const prompt = buildPrompt(
      batch,
      contextSample,
      useNestedKeys
    );

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that generates i18n keys for Japanese text. You always respond with valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No response from OpenAI");
    }

    // Track token usage
    if (response.usage) {
      totalPromptTokens += response.usage.prompt_tokens;
      totalCompletionTokens += response.usage.completion_tokens;
      totalTokens += response.usage.total_tokens;
    }

    try {
      const parsed = JSON.parse(content) as I18nJson;

      // Check for duplicates against existing keys
      const duplicates = findDuplicateKeys(parsed, Array.from(allExistingKeys));

      if (duplicates.length > 0) {
        console.log(`Found ${duplicates.length} duplicate keys, regenerating...`);

        // Create nodes for regeneration
        const nodesToRegenerate = createNodesForRegeneration(batch, parsed, duplicates);

        // Retry with a more explicit prompt
        const retryPrompt = buildPrompt(nodesToRegenerate, contextSample, useNestedKeys) +
          `\n\nIMPORTANT: The following keys are already taken and MUST NOT be used:\n${duplicates.join(', ')}\n\nGenerate completely DIFFERENT keys.`;

        const retryResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are a helpful assistant that generates i18n keys for Japanese text. You always respond with valid JSON only.",
            },
            {
              role: "user",
              content: retryPrompt,
            },
          ],
          temperature: 0.5, // Slightly higher temperature for more variation
          response_format: { type: "json_object" },
        });

        const retryContent = retryResponse.choices[0]?.message?.content;

        if (retryContent) {
          const retryParsed = JSON.parse(retryContent) as I18nJson;

          // Track retry token usage
          if (retryResponse.usage) {
            totalPromptTokens += retryResponse.usage.prompt_tokens;
            totalCompletionTokens += retryResponse.usage.completion_tokens;
            totalTokens += retryResponse.usage.total_tokens;
          }

          // Remove duplicate keys from original parsed and merge with retry result
          const filteredParsed: I18nJson = {};
          const generatedKeys = extractAllKeys(parsed);

          for (const key of generatedKeys) {
            if (!duplicates.includes(key)) {
              // Keep non-duplicate keys
              const parts = key.split('.');
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              let current: any = parsed;
              for (const part of parts) {
                current = current[part];
              }
              filteredParsed[key] = current;
            }
          }

          // Merge filtered and retry results
          results.push({ ...filteredParsed, ...retryParsed });

          // Add all new keys to tracking set
          extractAllKeys(retryParsed).forEach(k => allExistingKeys.add(k));
          extractAllKeys(filteredParsed).forEach(k => allExistingKeys.add(k));
        }
      } else {
        // No duplicates, use as-is
        results.push(parsed);

        // Add new keys to the tracking set
        extractAllKeys(parsed).forEach(key => allExistingKeys.add(key));
      }
    } catch {
      console.error("Failed to parse OpenAI response:", content);
      throw new Error("Invalid JSON response from OpenAI");
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
