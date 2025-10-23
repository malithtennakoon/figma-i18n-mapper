import { NextRequest, NextResponse } from 'next/server';
import {
  extractFigmaFileId,
  extractNodeIdFromUrl,
  fetchFigmaFile,
  extractAllText,
  getAvailablePages,
} from '@/lib/utils/figma';
import { filterJapaneseText } from '@/lib/utils/language';
import { filterNewTexts, getSampleContext } from '@/lib/utils/json-compare';
import { estimateBatchTokens } from '@/lib/utils/token-estimator';
import { extractAllKeys } from '@/lib/utils/openai';
import { filterTextNodes, getFilteringSummary } from '@/lib/utils/text-filters';
import { I18nJson } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      figmaUrl,
      jpJson,
      pageId,
      onlyVisible = true,
      enableSmartFilters = true,
      figmaToken, // Optional from UI
    } = body;

    if (!figmaUrl) {
      return NextResponse.json(
        { error: 'Figma URL is required' },
        { status: 400 }
      );
    }

    if (!jpJson) {
      return NextResponse.json(
        { error: 'Japanese JSON is required' },
        { status: 400 }
      );
    }

    // Use token from UI or environment variable (private, server-side only)
    const accessToken = figmaToken || process.env.FIGMA_API_TOKEN;

    // Extract file ID and node ID from URL
    const fileId = await extractFigmaFileId(figmaUrl);
    const nodeIdFromUrl = extractNodeIdFromUrl(figmaUrl);

    if (!fileId) {
      return NextResponse.json(
        { error: 'Invalid Figma URL format' },
        { status: 400 }
      );
    }

    // Fetch Figma file (will try public access first, then use token if provided)
    let figmaFile;
    try {
      figmaFile = await fetchFigmaFile(fileId, accessToken);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch Figma file';
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }

    // Get available pages (only if not extracting from specific node)
    const availablePages = nodeIdFromUrl ? [] : getAvailablePages(figmaFile);

    // Extract text nodes - priority: nodeId from URL > pageId > first page
    const allTextNodes = extractAllText(
      figmaFile,
      nodeIdFromUrl ? undefined : pageId,
      nodeIdFromUrl || undefined,
      onlyVisible
    );

    // Filter for Japanese text only
    const japaneseNodes = filterJapaneseText(allTextNodes);

    // Apply smart filters to exclude non-essential text (icons, symbols, etc.)
    let filteredNodes = japaneseNodes;
    let filterStats = {
      byContent: 0,
      byFrameName: 0,
      byLength: 0,
      duplicates: 0,
    };

    if (enableSmartFilters) {
      const filterResult = filterTextNodes(japaneseNodes, {
        minLength: 2,
        excludeByContent: true,
        excludeByFrameName: true,
        removeDuplicates: true,
        contextAwareDuplicates: true, // Keep duplicates in different components
        maxLength: 500,
      });
      filteredNodes = filterResult.filtered;
      filterStats = filterResult.excluded;
    }

    // Filter out texts that already exist in jp.json
    const parsedJpJson: I18nJson = typeof jpJson === 'string'
      ? JSON.parse(jpJson)
      : jpJson;

    const newNodes = filterNewTexts(filteredNodes, parsedJpJson);

    // Get context sample for AI
    const contextSample = getSampleContext(parsedJpJson, 5);

    // Extract existing keys for more accurate token estimation
    const existingKeys = extractAllKeys(parsedJpJson);

    // Estimate token usage with existing keys for better accuracy
    const tokenEstimate = estimateBatchTokens(newNodes, contextSample, existingKeys, 10);

    return NextResponse.json({
      success: true,
      data: {
        availablePages,
        extractionMode: nodeIdFromUrl ? 'node' : (pageId ? 'page' : 'firstPage'),
        nodeId: nodeIdFromUrl || null,
        totalTextNodes: allTextNodes.length,
        japaneseNodes: japaneseNodes.length,
        filteredNodes: filteredNodes.length,
        newNodes: newNodes.length,
        newTexts: newNodes,
        contextSample,
        tokenEstimate,
        filteringSummary: getFilteringSummary(filterStats),
        filterStats,
      },
    });
  } catch (error) {
    console.error('Error processing Figma file:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'An error occurred while processing the Figma file',
      },
      { status: 500 }
    );
  }
}
