import { FigmaTextNode } from '../types';

/**
 * More accurate token estimation for Japanese/English mixed text
 * Based on GPT-4o-mini tokenization patterns
 */
export function estimateTokens(text: string): number {
  // Count Japanese (Hiragana, Katakana, Kanji) vs other characters
  const japaneseChars = (text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length;
  const otherChars = text.length - japaneseChars;

  // Japanese: ~1.5 tokens per character (more accurate for GPT-4o-mini)
  // English/Numbers/Symbols: ~4 characters per token
  const japaneseTokens = Math.ceil(japaneseChars * 1.5);
  const otherTokens = Math.ceil(otherChars / 4);

  return japaneseTokens + otherTokens;
}

/**
 * Estimate total tokens for a batch of Figma nodes
 * Updated to reflect new approach: no existing keys in prompt + potential retry for duplicates
 */
export function estimateBatchTokens(
  nodes: FigmaTextNode[],
  contextSample: string,
  existingKeys: string[] = [],
  batchSize: number = 10
): {
  inputTokens: number;
  estimatedOutputTokens: number;
  totalEstimate: number;
} {
  // Calculate how many batches we'll have
  const numBatches = Math.ceil(nodes.length / batchSize);

  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // Process each batch
  for (let i = 0; i < numBatches; i++) {
    const batchNodes = nodes.slice(i * batchSize, (i + 1) * batchSize);
    let batchInputTokens = 0;

    // System message (~38 tokens based on actual message)
    batchInputTokens += 38;

    // Context sample (shown once per batch)
    batchInputTokens += estimateTokens(contextSample);

    // Base prompt template (instructions, rules, format examples)
    // The actual prompt has ~350-400 tokens of instructions
    batchInputTokens += 400;

    // NOTE: We no longer send existing keys in the initial prompt!
    // This saves significant tokens, especially with large existing key sets

    // Each node in this batch
    batchNodes.forEach((node) => {
      // Format: "1. Frame: "frameName" (Path: path > path)\n   Text: "text""
      batchInputTokens += 5; // numbering and formatting
      batchInputTokens += estimateTokens(node.frameName);
      batchInputTokens += estimateTokens(node.framePath.join(' > '));
      batchInputTokens += estimateTokens(node.text);
      batchInputTokens += 15; // structural tokens (Frame:, Path:, Text:, quotes, newlines)
    });

    // Estimate output tokens for this batch
    // JSON structure: each entry has key + colon + quoted value + comma/braces
    let batchOutputTokens = 5; // Opening/closing braces and formatting
    batchNodes.forEach(node => {
      // Key name (e.g., "contact_email"): ~2-4 tokens
      batchOutputTokens += 3;
      // Colon, space, quotes: ~2 tokens
      batchOutputTokens += 2;
      // The Japanese text value
      batchOutputTokens += estimateTokens(node.text);
      // Comma and newline: ~1 token
      batchOutputTokens += 1;
    });

    totalInputTokens += batchInputTokens;
    totalOutputTokens += batchOutputTokens;
  }

  // Add estimated tokens for potential duplicate regeneration
  // Assume ~5-10% duplicate rate (conservative estimate)
  const estimatedDuplicates = Math.ceil(nodes.length * 0.08); // 8% duplicate rate
  if (estimatedDuplicates > 0 && existingKeys.length > 0) {
    // Retry prompt includes: base prompt + duplicate keys list + instructions
    const retryInputTokens =
      38 + // system message
      estimateTokens(contextSample) +
      400 + // base prompt
      50 + // "IMPORTANT: The following keys are already taken..." instruction
      Math.ceil(estimatedDuplicates * 1.5) + // duplicate keys list
      (estimatedDuplicates * 25); // node info for duplicates (~25 tokens per node)

    const retryOutputTokens = estimatedDuplicates * 6; // ~6 tokens per regenerated key

    totalInputTokens += retryInputTokens;
    totalOutputTokens += retryOutputTokens;
  }

  return {
    inputTokens: totalInputTokens,
    estimatedOutputTokens: totalOutputTokens,
    totalEstimate: totalInputTokens + totalOutputTokens,
  };
}

/**
 * Estimate cost in USD based on gpt-4o-mini pricing
 * Input: $0.150 per 1M tokens
 * Output: $0.600 per 1M tokens
 */
export function estimateCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * 0.15;
  const outputCost = (outputTokens / 1_000_000) * 0.6;
  return inputCost + outputCost;
}

/**
 * Format large numbers with commas
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Check if token count is too high and return warning level
 */
export function getTokenWarningLevel(totalTokens: number): {
  level: 'safe' | 'warning' | 'danger';
  message: string;
} {
  if (totalTokens < 5000) {
    return {
      level: 'safe',
      message: 'Token usage looks good',
    };
  } else if (totalTokens < 15000) {
    return {
      level: 'warning',
      message: 'Moderate token usage - this will consume some of your OpenAI quota',
    };
  } else {
    return {
      level: 'danger',
      message: 'High token usage! Consider selecting a smaller page or filtering your Figma design',
    };
  }
}
