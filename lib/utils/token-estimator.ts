import { FigmaTextNode } from '../types';

/**
 * Rough token estimation (4 chars ≈ 1 token for English/Japanese mix)
 * This is a conservative estimate for GPT models
 */
export function estimateTokens(text: string): number {
  // For Japanese text, each character is roughly 1.5-2 tokens
  // For English, roughly 4 characters = 1 token
  // We'll use a conservative average: 3 characters = 1 token
  return Math.ceil(text.length / 3);
}

/**
 * Estimate total tokens for a batch of Figma nodes
 */
export function estimateBatchTokens(
  nodes: FigmaTextNode[],
  contextSample: string
): {
  inputTokens: number;
  estimatedOutputTokens: number;
  totalEstimate: number;
} {
  // Calculate input tokens
  let inputTokens = 0;

  // System message (~50 tokens)
  inputTokens += 50;

  // Context sample
  inputTokens += estimateTokens(contextSample);

  // Prompt template (~200 tokens)
  inputTokens += 200;

  // Each node contributes: frame name + frame path + text content
  nodes.forEach(node => {
    inputTokens += estimateTokens(node.frameName);
    inputTokens += estimateTokens(node.framePath.join(' > '));
    inputTokens += estimateTokens(node.text);
    // Plus formatting overhead (~10 tokens per node)
    inputTokens += 10;
  });

  // Estimate output tokens (JSON structure)
  // Each text will generate: key name (~5-10 tokens) + value + JSON formatting
  const estimatedOutputTokens = nodes.reduce((total, node) => {
    return total + 10 + estimateTokens(node.text) + 5; // key + value + formatting
  }, 0);

  return {
    inputTokens,
    estimatedOutputTokens,
    totalEstimate: inputTokens + estimatedOutputTokens,
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
