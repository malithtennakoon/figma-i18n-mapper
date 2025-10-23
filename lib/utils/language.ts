import { franc } from 'franc-min';
import { FigmaTextNode } from '../types';

export function detectLanguage(text: string): string {
  // franc returns ISO 639-3 codes
  // We'll map common ones to our needs
  const lang = franc(text);

  // Map to simpler codes
  const langMap: { [key: string]: string } = {
    'jpn': 'ja', // Japanese
    'eng': 'en', // English
    'und': 'unknown', // Undefined
  };

  return langMap[lang] || 'unknown';
}

export function isJapanese(text: string): boolean {
  // Check if text contains Japanese characters (Hiragana, Katakana, or Kanji)
  const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
  return japaneseRegex.test(text);
}

export function isEnglish(text: string): boolean {
  // Basic check for primarily ASCII/Latin characters
  const englishRegex = /^[a-zA-Z0-9\s.,!?;:'"()\-]+$/;
  return englishRegex.test(text.trim());
}

export function filterJapaneseText(nodes: FigmaTextNode[]): FigmaTextNode[] {
  return nodes.filter(node => {
    const text = node.text;

    // Skip empty or very short text
    if (!text || text.length < 1) return false;

    // Skip if it's English
    if (isEnglish(text)) return false;

    // Include if it contains Japanese characters
    return isJapanese(text);
  });
}
