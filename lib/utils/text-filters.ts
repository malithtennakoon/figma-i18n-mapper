import { FigmaTextNode } from '../types';

/**
 * Common patterns that indicate non-essential text that shouldn't be sent to ChatGPT
 */
const EXCLUDE_PATTERNS = {
  // Single characters or numbers (likely icons or decorative)
  singleChar: /^.$/,

  // Numbers only (counters, badges, etc.)
  numbersOnly: /^[\d\s,\.]+$/,

  // Common icon text patterns
  iconText: /^[→←↑↓✓✗×+\-=<>]+$/,

  // Special characters only
  specialCharsOnly: /^[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/,

  // Currency symbols only
  currencyOnly: /^[$€¥£₹]+$/,

  // Emoji only (basic pattern)
  emojiOnly: /^[\u{1F300}-\u{1F9FF}]+$/u,

  // Ellipsis or dots
  dotsOnly: /^[\.…]+$/,

  // Common placeholder text
  placeholder: /^(lorem ipsum|placeholder|test|example|xxx|000)/i,

  // Version numbers
  version: /^v?\d+\.\d+(\.\d+)?$/,
};

/**
 * Keywords in layer/frame names that indicate non-essential content
 */
const EXCLUDE_FRAME_KEYWORDS = [
  'icon',
  'logo',
  'badge',
  'avatar',
  'image',
  'img',
  'decoration',
  'divider',
  'spacer',
  'line',
  'dot',
  'bullet',
  'marker',
];

/**
 * Common repeated/template text that can be excluded
 */
const COMMON_REPETITIVE_TEXT = [
  '•',
  '/',
  '|',
  '-',
  '—',
  '–',
  '+',
  '×',
];

/**
 * Check if text should be excluded based on content patterns
 */
export function shouldExcludeByContent(text: string): boolean {
  const trimmed = text.trim();

  // Exclude empty or very short text (less than 2 characters)
  if (trimmed.length < 2) {
    return true;
  }

  // Check against all exclude patterns
  for (const pattern of Object.values(EXCLUDE_PATTERNS)) {
    if (pattern.test(trimmed)) {
      return true;
    }
  }

  // Check common repetitive text
  if (COMMON_REPETITIVE_TEXT.includes(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Check if text should be excluded based on frame/layer name
 */
export function shouldExcludeByFrameName(framePath: string[]): boolean {
  const frameNameLower = framePath.join(' ').toLowerCase();

  return EXCLUDE_FRAME_KEYWORDS.some(keyword =>
    frameNameLower.includes(keyword)
  );
}

/**
 * Remove duplicate texts - context-aware version
 * Only removes duplicates if they have the EXACT same text AND parent frame
 * This preserves repeated instances in different components
 */
export function removeDuplicateTexts(
  nodes: FigmaTextNode[],
  contextAware: boolean = true
): FigmaTextNode[] {
  if (!contextAware) {
    // Simple deduplication by text only
    const seen = new Set<string>();
    return nodes.filter(node => {
      if (seen.has(node.text)) {
        return false;
      }
      seen.add(node.text);
      return true;
    });
  }

  // Context-aware deduplication
  // Keep duplicates if they're in different parent frames/components
  const seen = new Set<string>();
  return nodes.filter(node => {
    // Create a unique key using the last 2-3 levels of the path for better context
    // This distinguishes "Option 1 > Body" from "Option 2 > Body"
    const pathDepth = node.framePath.length;
    let contextPath = '';

    if (pathDepth >= 2) {
      // Use last 2 levels: e.g., "Option 1 > Body"
      contextPath = node.framePath.slice(-2).join(' > ');
    } else if (pathDepth === 1) {
      contextPath = node.framePath[0];
    } else {
      contextPath = 'root';
    }

    const contextKey = `${contextPath}::${node.text}`;

    if (seen.has(contextKey)) {
      return false;
    }
    seen.add(contextKey);
    return true;
  });
}

/**
 * Filter options for text processing
 */
export interface FilterOptions {
  minLength?: number;
  excludeByContent?: boolean;
  excludeByFrameName?: boolean;
  removeDuplicates?: boolean;
  contextAwareDuplicates?: boolean; // NEW: Keep duplicates in different contexts
  maxLength?: number;
}

/**
 * Apply all filters to text nodes
 */
export function filterTextNodes(
  nodes: FigmaTextNode[],
  options: FilterOptions = {}
): {
  filtered: FigmaTextNode[];
  excluded: {
    byContent: number;
    byFrameName: number;
    byLength: number;
    duplicates: number;
  };
} {
  const {
    minLength = 2,
    excludeByContent = true,
    excludeByFrameName = true,
    removeDuplicates = true,
    contextAwareDuplicates = true, // NEW: Default to context-aware
    maxLength = 500, // Exclude extremely long text (likely not UI text)
  } = options;

  let result = [...nodes];
  const stats = {
    byContent: 0,
    byFrameName: 0,
    byLength: 0,
    duplicates: 0,
  };

  // Filter by content patterns
  if (excludeByContent) {
    const beforeCount = result.length;
    result = result.filter(node => !shouldExcludeByContent(node.text));
    stats.byContent = beforeCount - result.length;
  }

  // Filter by frame name
  if (excludeByFrameName) {
    const beforeCount = result.length;
    result = result.filter(node => !shouldExcludeByFrameName(node.framePath));
    stats.byFrameName = beforeCount - result.length;
  }

  // Filter by length
  const beforeCount = result.length;
  result = result.filter(node => {
    const len = node.text.trim().length;
    return len >= minLength && len <= maxLength;
  });
  stats.byLength = beforeCount - result.length;

  // Remove duplicates (context-aware or simple)
  if (removeDuplicates) {
    const beforeCount = result.length;
    result = removeDuplicateTexts(result, contextAwareDuplicates);
    stats.duplicates = beforeCount - result.length;
  }

  return {
    filtered: result,
    excluded: stats,
  };
}

/**
 * Get human-readable summary of filtering
 */
export function getFilteringSummary(excluded: {
  byContent: number;
  byFrameName: number;
  byLength: number;
  duplicates: number;
}): string {
  const parts: string[] = [];

  if (excluded.byContent > 0) {
    parts.push(`${excluded.byContent} icons/symbols`);
  }
  if (excluded.byFrameName > 0) {
    parts.push(`${excluded.byFrameName} decorative elements`);
  }
  if (excluded.byLength > 0) {
    parts.push(`${excluded.byLength} invalid length`);
  }
  if (excluded.duplicates > 0) {
    parts.push(`${excluded.duplicates} exact duplicates`);
  }

  if (parts.length === 0) {
    return 'No texts filtered out';
  }

  return `Filtered out: ${parts.join(', ')}`;
}
