'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FileUpload } from '@/components/custom/file-upload';
import { JsonViewer } from '@/components/custom/json-viewer';
import { ThemeToggle } from '@/components/custom/theme-toggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, Info, Zap, Filter } from 'lucide-react';
import { I18nJson } from '@/lib/types';
import { getTokenWarningLevel, formatNumber, estimateCost } from '@/lib/utils/token-estimator';

const queryClient = new QueryClient();

function AppContent() {
  const [enJson, setEnJson] = useState<string>('');
  const [jpJson, setJpJson] = useState<string>('');
  const [figmaUrl, setFigmaUrl] = useState<string>('');
  const [openaiKey, setOpenaiKey] = useState<string>('');
  const [figmaToken, setFigmaToken] = useState<string>('');
  const [availablePages, setAvailablePages] = useState<{ id: string; name: string }[]>([]);
  const [selectedPage, setSelectedPage] = useState<string>('');
  const [extractionMode, setExtractionMode] = useState<string>('');
  const [extractedNodeId, setExtractedNodeId] = useState<string | null>(null);
  const [enableSmartFilters, setEnableSmartFilters] = useState<boolean>(true);
  const [filteringSummary, setFilteringSummary] = useState<string>('');
  const [step, setStep] = useState<'setup' | 'review' | 'generating' | 'complete'>('setup');
  const [extractedTexts, setExtractedTexts] = useState<Array<{ text: string; frameName: string; framePath: string[]; nodeId?: string }>>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [generatedKeys, setGeneratedKeys] = useState<I18nJson | null>(null);
  const [stats, setStats] = useState<{
    total: number;
    japanese: number;
    new: number;
  } | null>(null);
  const [tokenEstimate, setTokenEstimate] = useState<{
    inputTokens: number;
    estimatedOutputTokens: number;
    totalEstimate: number;
  } | null>(null);
  const [actualTokenUsage, setActualTokenUsage] = useState<{
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } | null>(null);

  // Step 1: Extract and review texts
  const handleExtractTexts = async () => {
    if (!enJson || !jpJson) {
      setError('Please upload both en.json and jp.json files');
      return;
    }

    if (!figmaUrl) {
      setError('Please enter a Figma URL');
      return;
    }

    setLoading(true);
    setError('');
    setProgress(10);
    setStatus('Extracting text from Figma...');
    setStep('setup');
    setGeneratedKeys(null);
    setStats(null);
    setTokenEstimate(null);
    setActualTokenUsage(null);
    setExtractedTexts([]);

    try {
      // Extract from Figma
      const figmaResponse = await fetch('/api/figma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          figmaUrl,
          jpJson,
          pageId: selectedPage || undefined,
          onlyVisible: true,
          enableSmartFilters,
          figmaToken: figmaToken || undefined, // Optional, uses env if not provided
        }),
      });

      if (!figmaResponse.ok) {
        const errorData = await figmaResponse.json();
        throw new Error(errorData.error || 'Failed to fetch Figma file');
      }

      const figmaData = await figmaResponse.json();
      setProgress(40);

      // Set extraction mode info
      if (figmaData.data.extractionMode) {
        setExtractionMode(figmaData.data.extractionMode);
      }
      if (figmaData.data.nodeId) {
        setExtractedNodeId(figmaData.data.nodeId);
      }

      // Update available pages if this is the first fetch (only for page-based extraction)
      if (figmaData.data.availablePages && figmaData.data.availablePages.length > 0) {
        setAvailablePages(figmaData.data.availablePages);
        // Auto-select first page if none selected
        if (!selectedPage && figmaData.data.availablePages[0]) {
          setSelectedPage(figmaData.data.availablePages[0].id);
        }
      }

      setStats({
        total: figmaData.data.totalTextNodes,
        japanese: figmaData.data.japaneseNodes,
        new: figmaData.data.newNodes,
      });

      // Set token estimate
      if (figmaData.data.tokenEstimate) {
        setTokenEstimate(figmaData.data.tokenEstimate);
      }

      // Set filtering summary
      if (figmaData.data.filteringSummary) {
        setFilteringSummary(figmaData.data.filteringSummary);
      }

      // Store extracted texts for review
      if (figmaData.data.newTexts) {
        setExtractedTexts(figmaData.data.newTexts);
      }

      setProgress(100);

      if (figmaData.data.newNodes === 0) {
        setStatus('No new Japanese texts found!');
        setLoading(false);
        setStep('setup');
        return;
      }

      // Move to review step
      setStatus('Texts extracted! Review and confirm to generate keys.');
      setLoading(false);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setStatus('');
      setStep('setup');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Generate keys with AI
  const handleGenerateKeys = async () => {
    // OpenAI key is optional if environment variable is set (checked server-side)

    if (extractedTexts.length === 0) {
      setError('No texts to generate keys for');
      return;
    }

    setLoading(true);
    setError('');
    setProgress(10);
    setStatus('Generating i18n keys with AI...');
    setStep('generating');

    try {
      // Get context sample and existing keys from jp.json
      const parsedJpJson = typeof jpJson === 'string' ? JSON.parse(jpJson) : jpJson;
      const contextSample = JSON.stringify(parsedJpJson).substring(0, 1000);

      // Extract all existing keys from jp.json to avoid duplicates
      const extractAllKeys = (obj: any, prefix = ''): string[] => {
        const keys: string[] = [];
        for (const key in obj) {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            keys.push(...extractAllKeys(obj[key], fullKey));
          } else {
            keys.push(fullKey);
          }
        }
        return keys;
      };

      const existingKeys = extractAllKeys(parsedJpJson);

      setProgress(50);

      const generateResponse = await fetch('/api/generate-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes: extractedTexts,
          contextSample,
          openaiApiKey: openaiKey || undefined, // Optional, uses env if not provided
          existingKeys, // Pass existing keys to avoid duplicates
        }),
      });

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json();
        throw new Error(errorData.error || 'Failed to generate keys');
      }

      const generateData = await generateResponse.json();
      setProgress(100);
      setStatus('Complete! Keys generated successfully.');
      setGeneratedKeys(generateData.data.generatedKeys);
      setStep('complete');

      // Set actual token usage
      if (generateData.data.tokenUsage) {
        setActualTokenUsage(generateData.data.tokenUsage);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setStatus('');
      setStep('review');
    } finally {
      setLoading(false);
    }
  };

  const handleStartOver = () => {
    setStep('setup');
    setExtractedTexts([]);
    setStats(null);
    setTokenEstimate(null);
    setActualTokenUsage(null);
    setGeneratedKeys(null);
    setFilteringSummary('');
    setError('');
    setStatus('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex-1 text-center space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Figma i18n Key Mapper</h1>
            <p className="text-muted-foreground">
              Automatically generate i18n keys for Japanese text from Figma designs
            </p>
          </div>
          <div className="absolute right-4 top-4">
            <ThemeToggle />
          </div>
        </div>

        {/* File Uploads */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FileUpload
            id="en-json"
            label="English JSON (en.json)"
            description="Upload your English localization file"
            onFileContent={(content, _filename) => setEnJson(content)}
          />
          <FileUpload
            id="jp-json"
            label="Japanese JSON (jp.json)"
            description="Upload your Japanese localization file"
            onFileContent={(content, _filename) => setJpJson(content)}
          />
        </div>

        {/* Figma Input */}
        <Card>
          <CardHeader>
            <CardTitle>Figma Configuration</CardTitle>
            <CardDescription>
              Enter your Figma file URL (ensure it's shared with "Anyone with the link can view")
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="figma-url">Figma File URL</Label>
              <Input
                id="figma-url"
                type="url"
                placeholder="https://www.figma.com/file/..."
                value={figmaUrl}
                onChange={(e) => {
                  setFigmaUrl(e.target.value);
                  // Reset pages when URL changes
                  setAvailablePages([]);
                  setSelectedPage('');
                }}
              />
              <p className="text-xs text-muted-foreground">
                Make sure the file is set to &quot;Anyone with the link can view&quot; in Figma sharing settings
              </p>
              {extractionMode === 'node' && extractedNodeId && (
                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    <strong>Extracting from specific frame/node:</strong> {extractedNodeId}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Only text from the selected frame in your URL will be extracted
                  </p>
                </div>
              )}
            </div>

            {availablePages.length > 0 && extractionMode !== 'node' && (
              <div className="space-y-2">
                <Label htmlFor="page-select">Select Page</Label>
                <Select value={selectedPage} onValueChange={setSelectedPage}>
                  <SelectTrigger id="page-select">
                    <SelectValue placeholder="Select a page to extract from" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePages.map((page) => (
                      <SelectItem key={page.id} value={page.id}>
                        {page.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Only visible text from the selected page will be extracted (first page by default)
                </p>
              </div>
            )}

            <div className="flex items-start space-x-2 pt-2">
              <Checkbox
                id="smart-filters"
                checked={enableSmartFilters}
                onCheckedChange={(checked) => setEnableSmartFilters(checked === true)}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="smart-filters"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                >
                  <Filter className="h-3.5 w-3.5" />
                  Enable Smart Filters
                </label>
                <p className="text-xs text-muted-foreground">
                  Excludes icons, symbols, numbers, and exact duplicates. Disable this if you're missing expected texts.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* OpenAI API Key */}
        <Card>
          <CardHeader>
            <CardTitle>OpenAI API Key (Optional)</CardTitle>
            <CardDescription>
              Leave empty to use server-side API key from environment variables
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="openai-key">OpenAI API Key</Label>
              <Input
                id="openai-key"
                type="password"
                placeholder="sk-... (optional if configured in .env.local)"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                If you have set OPENAI_API_KEY in your .env.local file, you can leave this empty
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          {step === 'setup' && (
            <Button
              onClick={handleExtractTexts}
              disabled={loading}
              size="lg"
              className="w-full md:w-auto px-12"
            >
              {loading ? 'Extracting...' : 'Extract Texts from Figma'}
            </Button>
          )}

          {step === 'review' && (
            <>
              <Button
                onClick={handleStartOver}
                variant="outline"
                size="lg"
                className="w-full md:w-auto px-8"
              >
                Start Over
              </Button>
              {openaiKey && (
                <Button
                  onClick={handleGenerateKeys}
                  disabled={loading}
                  size="lg"
                  className="w-full md:w-auto px-12"
                >
                  {loading ? 'Generating...' : 'Generate i18n Keys with AI'}
                </Button>
              )}
            </>
          )}

          {(step === 'generating' || step === 'complete') && (
            <Button
              onClick={handleStartOver}
              variant="outline"
              size="lg"
              className="w-full md:w-auto px-12"
            >
              Start Over
            </Button>
          )}
        </div>

        {/* Progress */}
        {loading && (
          <Card>
            <CardHeader>
              <CardTitle>Processing</CardTitle>
              <CardDescription>{status}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={progress} className="w-full" />

              {/* Shimmer loading skeletons */}
              <div className="space-y-3 mt-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        {stats && (
          <Card>
            <CardHeader>
              <CardTitle>Analysis Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Text Nodes</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.japanese}</p>
                  <p className="text-sm text-muted-foreground">Japanese Texts</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.new}</p>
                  <p className="text-sm text-muted-foreground">New Texts</p>
                </div>
              </div>
              {filteringSummary && filteringSummary !== 'No texts filtered out' && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Filter className="h-4 w-4" />
                    <span>{filteringSummary}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Extracted Texts Preview */}
        {step === 'review' && extractedTexts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Extracted Texts - Review Before Generating</CardTitle>
              <CardDescription>
                These {extractedTexts.length} Japanese texts will be sent to OpenAI for key generation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto space-y-3">
                {extractedTexts.slice(0, 50).map((item, index) => (
                  <div
                    key={index}
                    className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {item.frameName}
                          </p>
                          {item.nodeId && (
                            <code className="text-xs text-muted-foreground bg-slate-200 dark:bg-slate-800 px-1 rounded">
                              {item.nodeId}
                            </code>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.framePath.join(' > ')}
                        </p>
                        <p className="text-base mt-2 text-slate-700 dark:text-slate-300">
                          {item.text}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">
                        #{index + 1}
                      </span>
                    </div>
                  </div>
                ))}
                {extractedTexts.length > 50 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    ... and {extractedTexts.length - 50} more texts
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Token Estimate & Warning */}
        {tokenEstimate && stats && stats.new > 0 && (
          <>
            {(() => {
              const warning = getTokenWarningLevel(tokenEstimate.totalEstimate);
              const estimatedCost = estimateCost(
                tokenEstimate.inputTokens,
                tokenEstimate.estimatedOutputTokens
              );

              return (
                <>
                  <Alert
                    variant={warning.level === 'danger' ? 'destructive' : 'default'}
                    className={
                      warning.level === 'warning'
                        ? 'border-yellow-500 dark:border-yellow-600'
                        : ''
                    }
                  >
                    {warning.level === 'danger' ? (
                      <AlertTriangle className="h-4 w-4" />
                    ) : warning.level === 'warning' ? (
                      <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                    ) : (
                      <Zap className="h-4 w-4" />
                    )}
                    <AlertTitle>Estimated Token Usage</AlertTitle>
                    <AlertDescription>
                      <div className="mt-2 space-y-1">
                        <p>{warning.message}</p>
                        <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                          <div>
                            <strong>Input tokens:</strong> {formatNumber(tokenEstimate.inputTokens)}
                          </div>
                          <div>
                            <strong>Output tokens:</strong>{' '}
                            {formatNumber(tokenEstimate.estimatedOutputTokens)}
                          </div>
                          <div>
                            <strong>Total estimate:</strong>{' '}
                            {formatNumber(tokenEstimate.totalEstimate)}
                          </div>
                          <div>
                            <strong>Estimated cost:</strong> ${estimatedCost.toFixed(4)}
                          </div>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                </>
              );
            })()}
          </>
        )}

        {/* Actual Token Usage */}
        {actualTokenUsage && (
          <Card>
            <CardHeader>
              <CardTitle>Actual Token Usage</CardTitle>
              <CardDescription>OpenAI API consumption for this generation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">
                    {formatNumber(actualTokenUsage.promptTokens)}
                  </p>
                  <p className="text-sm text-muted-foreground">Prompt Tokens</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {formatNumber(actualTokenUsage.completionTokens)}
                  </p>
                  <p className="text-sm text-muted-foreground">Completion Tokens</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {formatNumber(actualTokenUsage.totalTokens)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Tokens</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t text-center">
                <p className="text-sm text-muted-foreground">
                  Actual cost: $
                  {estimateCost(
                    actualTokenUsage.promptTokens,
                    actualTokenUsage.completionTokens
                  ).toFixed(4)}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Generated Keys */}
        {generatedKeys && (
          <JsonViewer
            json={generatedKeys}
            title="Generated i18n Keys"
            description="Copy or download the generated keys to use in your project"
          />
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
