export interface FigmaTextNode {
  text: string;
  frameName: string;
  framePath: string[];
  nodeId: string;
}

export interface I18nJson {
  [key: string]: string | I18nJson;
}

export interface GeneratedKey {
  keyPath: string[];
  value: string;
}

export interface ProcessingResult {
  newTexts: FigmaTextNode[];
  existingTexts: FigmaTextNode[];
  generatedKeys: I18nJson;
}
