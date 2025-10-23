import { NextRequest, NextResponse } from 'next/server';
import { generateKeysInBatches } from '@/lib/utils/openai';
import { FigmaTextNode } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nodes, contextSample, openaiApiKey, existingKeys } = body;

    if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
      return NextResponse.json(
        { error: 'Text nodes are required' },
        { status: 400 }
      );
    }

    if (!contextSample) {
      return NextResponse.json(
        { error: 'Context sample is required' },
        { status: 400 }
      );
    }

    // Use provided API key or fallback to environment variable
    const apiKey = openaiApiKey || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key is required' },
        { status: 400 }
      );
    }

    // Generate keys in batches
    const result = await generateKeysInBatches(
      nodes as FigmaTextNode[],
      contextSample,
      apiKey,
      existingKeys || [],
      10 // batch size
    );

    return NextResponse.json({
      success: true,
      data: {
        generatedKeys: result.generatedKeys,
        count: nodes.length,
        tokenUsage: result.tokenUsage,
      },
    });
  } catch (error) {
    console.error('Error generating keys:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'An error occurred while generating keys',
      },
      { status: 500 }
    );
  }
}
