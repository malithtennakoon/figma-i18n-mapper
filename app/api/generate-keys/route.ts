import { NextRequest, NextResponse } from 'next/server';
import { generateKeysInBatches } from '@/lib/utils/openai';
import { FigmaTextNode } from '@/lib/types';
import { logUsage } from '@/lib/db';
import { estimateCost } from '@/lib/utils/token-estimator';
import { verifyUserEmail } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nodes, contextSample, openaiApiKey, existingKeys, useNestedKeys, userEmail, figmaUrl } = body;

    // SECURITY: Verify user is authenticated and in database
    const authResult = await verifyUserEmail(userEmail);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: authResult.error || 'Authentication required' },
        { status: 401 }
      );
    }

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
      10, // batch size
      useNestedKeys || false // nested keys preference
    );

    // Log usage to database if userEmail is provided
    if (userEmail && figmaUrl && result.tokenUsage) {
      try {
        const cost = estimateCost(
          result.tokenUsage.promptTokens,
          result.tokenUsage.completionTokens
        );

        await logUsage({
          userEmail,
          figmaUrl,
          extractedTextsCount: nodes.length,
          extractedTextsSample: nodes,
          promptTokens: result.tokenUsage.promptTokens,
          completionTokens: result.tokenUsage.completionTokens,
          totalTokens: result.tokenUsage.totalTokens,
          cost,
        });
      } catch (logError) {
        // Log the error but don't fail the request
        console.error('Error logging usage:', logError);
      }
    }

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
