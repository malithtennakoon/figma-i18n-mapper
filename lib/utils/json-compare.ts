import { I18nJson, FigmaTextNode } from '../types';

export function findTextInJson(text: string, json: I18nJson): boolean {
  // Recursively search for text in the JSON structure
  function search(obj: I18nJson | string): boolean {
    if (typeof obj === 'string') {
      return obj === text;
    }

    for (const key in obj) {
      if (search(obj[key] as I18nJson | string)) {
        return true;
      }
    }

    return false;
  }

  return search(json);
}

export function filterNewTexts(
  nodes: FigmaTextNode[],
  jpJson: I18nJson
): FigmaTextNode[] {
  return nodes.filter(node => !findTextInJson(node.text, jpJson));
}

export function getSampleContext(jpJson: I18nJson, maxItems: number = 5): string {
  // Get a sample of the JSON structure to provide context to the AI
  const sample: I18nJson = {};
  let count = 0;

  function addSample(source: I18nJson, target: I18nJson) {
    for (const key in source) {
      if (count >= maxItems) return;

      if (typeof source[key] === 'string') {
        target[key] = source[key] as string;
        count++;
      } else if (typeof source[key] === 'object') {
        target[key] = {};
        addSample(source[key] as I18nJson, target[key] as I18nJson);
      }
    }
  }

  addSample(jpJson, sample);

  return JSON.stringify(sample, null, 2);
}

export function mergeI18nJson(base: I18nJson, additions: I18nJson): I18nJson {
  // Deep merge two JSON objects
  const result: I18nJson = { ...base };

  for (const key in additions) {
    if (typeof additions[key] === 'object' && !Array.isArray(additions[key])) {
      result[key] = mergeI18nJson(
        (base[key] as I18nJson) || {},
        additions[key] as I18nJson
      );
    } else {
      result[key] = additions[key];
    }
  }

  return result;
}
