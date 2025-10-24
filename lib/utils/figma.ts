import { FigmaTextNode } from '../types';

interface FigmaNode {
  id: string;
  name: string;
  type: string;
  characters?: string;
  children?: FigmaNode[];
  visible?: boolean;
}

interface FigmaFile {
  document: FigmaNode;
  name: string;
}

export async function extractFigmaFileId(url: string): Promise<string | null> {
  // Extract file ID from Figma URL
  // Format: https://www.figma.com/file/{file_id}/...
  // or: https://www.figma.com/design/{file_id}/...
  const regex = /figma\.com\/(file|design)\/([a-zA-Z0-9]+)/;
  const match = url.match(regex);
  return match ? match[2] : null;
}

export function extractNodeIdFromUrl(url: string): string | null {
  // Extract node-id from Figma URL query parameter
  // Format: ?node-id=123-456 or &node-id=123-456
  try {
    const urlObj = new URL(url);
    const nodeId = urlObj.searchParams.get('node-id');
    if (nodeId) {
      // Convert node-id format (123-456) to Figma's internal format (123:456)
      return nodeId.replace('-', ':');
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchFigmaFile(
  fileId: string,
  apiToken?: string
): Promise<FigmaFile> {
  // First, try to fetch without a token (for public files)
  try {
    const publicResponse = await fetch(`https://api.figma.com/v1/files/${fileId}`);

    if (publicResponse.ok) {
      return publicResponse.json();
    }

    // If public access fails but we have a token, try with the token
    if (apiToken) {
      const privateResponse = await fetch(`https://api.figma.com/v1/files/${fileId}`, {
        headers: {
          'X-Figma-Token': apiToken,
        },
      });

      if (privateResponse.ok) {
        return privateResponse.json();
      }

      if (privateResponse.status === 403) {
        throw new Error('Access denied. This file may be private or the API token is invalid.');
      }

      throw new Error(`Failed to fetch Figma file: ${privateResponse.statusText}`);
    }

    // No token available and public access failed
    if (publicResponse.status === 403 || publicResponse.status === 404) {
      throw new Error('Unable to access this Figma file. Please ensure the file URL is correct and the file is set to "Anyone with the link can view" in Figma sharing settings.');
    }

    throw new Error(`Failed to fetch Figma file: ${publicResponse.statusText}`);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch Figma file. Please check the URL and try again.');
  }
}

export function extractTextNodes(
  node: FigmaNode,
  framePath: string[] = [],
  onlyVisible: boolean = true,
  debugMode: boolean = false
): FigmaTextNode[] {
  const textNodes: FigmaTextNode[] = [];

  // Debug logging
  if (debugMode) {
    console.log(`Processing node: ${node.name} (${node.type}) [ID: ${node.id}]`, {
      visible: node.visible,
      hasChildren: !!node.children,
      childrenCount: node.children?.length || 0,
      isTextNode: node.type === 'TEXT',
      characters: node.type === 'TEXT' ? node.characters : undefined,
    });
  }

  // Skip hidden nodes if onlyVisible is true
  if (onlyVisible && node.visible === false) {
    if (debugMode) {
      console.log(`  → SKIPPED (hidden)`);
    }
    return textNodes;
  }

  // Update the frame path if this is a frame or component
  const currentPath = [...framePath];
  if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
    // For instances/components with the same name, append a unique identifier
    // This helps distinguish "Option 1" from "Option 2" etc.
    let pathEntry = node.name;

    // If this is an instance or component, make the path unique by including part of ID
    if (node.type === 'INSTANCE' || node.type === 'COMPONENT') {
      const shortId = node.id.split(':')[1]?.substring(0, 4) || node.id.substring(0, 4);
      pathEntry = `${node.name} [${shortId}]`;
    }

    currentPath.push(pathEntry);

    if (debugMode) {
      console.log(`  → Added to path: ${pathEntry}`);
    }
  }

  // Check if this is a text node
  if (node.type === 'TEXT' && node.characters) {
    const textNode = {
      text: node.characters.trim(),
      frameName: currentPath[currentPath.length - 1] || 'Root',
      framePath: currentPath,
      nodeId: node.id,
    };
    textNodes.push(textNode);

    if (debugMode) {
      console.log(`  → EXTRACTED TEXT: "${node.characters.trim()}" at path: ${currentPath.join(' > ')}`);
    }
  }

  // Recursively process children
  if (node.children) {
    if (debugMode) {
      console.log(`  → Processing ${node.children.length} children...`);
    }
    for (const child of node.children) {
      textNodes.push(...extractTextNodes(child, currentPath, onlyVisible, debugMode));
    }
  }

  return textNodes;
}

export function getAvailablePages(figmaFile: FigmaFile): { id: string; name: string }[] {
  // The document's children are the pages
  if (!figmaFile.document.children) return [];

  return figmaFile.document.children
    .filter(child => child.type === 'CANVAS')
    .map(page => ({ id: page.id, name: page.name }));
}

export function extractTextFromPage(
  figmaFile: FigmaFile,
  pageId?: string,
  onlyVisible: boolean = true,
  debugMode: boolean = false
): FigmaTextNode[] {
  // If no pageId specified, use the first page only (not all pages)
  if (!figmaFile.document.children) return [];

  let targetPage: FigmaNode | undefined;

  if (pageId) {
    targetPage = figmaFile.document.children.find(child => child.id === pageId);
  } else {
    // Use first page by default
    targetPage = figmaFile.document.children[0];
  }

  if (!targetPage) {
    throw new Error('Page not found');
  }

  return extractTextNodes(targetPage, [], onlyVisible, debugMode);
}

export function findNodeById(
  node: FigmaNode,
  targetId: string
): FigmaNode | null {
  // Search for a specific node by ID
  if (node.id === targetId) {
    return node;
  }

  if (node.children) {
    for (const child of node.children) {
      const found = findNodeById(child, targetId);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

export function extractTextFromNode(
  figmaFile: FigmaFile,
  nodeId: string,
  onlyVisible: boolean = true,
  debugMode: boolean = false
): FigmaTextNode[] {
  // Find the specific node
  const targetNode = findNodeById(figmaFile.document, nodeId);

  if (!targetNode) {
    throw new Error(`Node with ID ${nodeId} not found in Figma file`);
  }

  if (debugMode) {
    console.log('=== STARTING NODE EXTRACTION ===');
    console.log(`Target node: ${targetNode.name} (${targetNode.type}) [ID: ${targetNode.id}]`);
    console.log(`Children count: ${targetNode.children?.length || 0}`);
    console.log('================================\n');
  }

  // Extract text only from this node and its children
  return extractTextNodes(targetNode, [], onlyVisible, debugMode);
}

export function extractAllText(
  figmaFile: FigmaFile,
  pageId?: string,
  nodeId?: string,
  onlyVisible: boolean = true,
  debugMode: boolean = false
): FigmaTextNode[] {
  // If nodeId is specified, extract from that specific node only
  if (nodeId) {
    return extractTextFromNode(figmaFile, nodeId, onlyVisible, debugMode);
  }

  // Otherwise, extract from specific page or first page only
  return extractTextFromPage(figmaFile, pageId, onlyVisible, debugMode);
}
