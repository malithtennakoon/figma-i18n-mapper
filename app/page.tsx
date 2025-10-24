'use client';

import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FileUpload } from '@/components/custom/file-upload';
import { JsonViewer } from '@/components/custom/json-viewer';
import { ThemeToggle } from '@/components/custom/theme-toggle';
import { EmailAuthModal } from '@/components/custom/email-auth-modal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, Info, Zap, Filter, CheckCircle2, ChevronDown, ChevronUp, BadgeCheck, Loader2, X, User, BarChart3 } from 'lucide-react';
import { I18nJson } from '@/lib/types';
import { getTokenWarningLevel, formatNumber, estimateCost, estimateBatchTokens } from '@/lib/utils/token-estimator';
import Link from 'next/link';

const queryClient = new QueryClient();

// Utility function to extract all keys from nested JSON
function extractAllKeys(obj: any, prefix = ''): string[] {
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
}

function AppContent() {
  const [userEmail, setUserEmail] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [enJson, setEnJson] = useState<string>('');
  const [jpJson, setJpJson] = useState<string>('');
  const [figmaUrl, setFigmaUrl] = useState<string>('');
  const [openaiKey, setOpenaiKey] = useState<string>('');
  const [figmaToken, setFigmaToken] = useState<string>('');
  const [localazyFetched, setLocalazyFetched] = useState<boolean>(false);
  const [availablePages, setAvailablePages] = useState<{ id: string; name: string }[]>([]);
  const [selectedPage, setSelectedPage] = useState<string>('');
  const [extractionMode, setExtractionMode] = useState<string>('');
  const [extractedNodeId, setExtractedNodeId] = useState<string | null>(null);
  const [enableSmartFilters, setEnableSmartFilters] = useState<boolean>(true);
  const [useNestedKeys, setUseNestedKeys] = useState<boolean>(true);
  const [filteringSummary, setFilteringSummary] = useState<string>('');
  const [step, setStep] = useState<'setup' | 'review' | 'generating' | 'complete'>('setup');
  const [extractedTexts, setExtractedTexts] = useState<Array<{ text: string; frameName: string; framePath: string[]; nodeId?: string }>>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
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
  const [collapsedSections, setCollapsedSections] = useState<{
    step1: boolean;
    step2: boolean;
    analysisResults: boolean;
    extractedTexts: boolean;
    tokenEstimate: boolean;
    step3: boolean;
  }>({
    step1: false,
    step2: true,
    analysisResults: false,
    extractedTexts: false,
    tokenEstimate: false,
    step3: true,
  });
  const [completedSteps, setCompletedSteps] = useState<{
    step1: boolean;
    step2: boolean;
    step3: boolean;
  }>({
    step1: false,
    step2: false,
    step3: false,
  });

  // Restore authentication state from localStorage on mount
  useEffect(() => {
    const storedEmail = localStorage.getItem('userEmail');
    const storedRole = localStorage.getItem('userRole');

    if (storedEmail && storedRole) {
      setUserEmail(storedEmail);
      setUserRole(storedRole);
      setIsAuthenticated(true);
    }
  }, []);

  // Fetch files from Localazy
  const handleFetchFromLocalazy = async () => {
    setLoading(true);
    setLoadingStep('localazy');
    setError('');

    try {
      const response = await fetch(`/api/localazy?userEmail=${encodeURIComponent(userEmail)}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch from Localazy');
      }

      const data = await response.json();

      // Set the fetched JSON data
      setEnJson(JSON.stringify(data.data.enJson));
      setJpJson(JSON.stringify(data.data.jaJson));
      setLocalazyFetched(true);

      // Mark step 1 as completed and collapse it
      setCompletedSteps((prev) => ({ ...prev, step1: true }));
      setCollapsedSections((prev) => ({ ...prev, step1: true, step2: false }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

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
    setLoadingStep('figma');
    setError('');
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
          userEmail, // Required for authentication
        }),
      });

      if (!figmaResponse.ok) {
        const errorData = await figmaResponse.json();
        throw new Error(errorData.error || 'Failed to fetch Figma file');
      }

      const figmaData = await figmaResponse.json();

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

      if (figmaData.data.newNodes === 0) {
        setError('No new Japanese texts found!');
        setLoading(false);
        setLoadingStep('');
        setStep('setup');
        return;
      }

      // Move to review step
      setLoading(false);
      setLoadingStep('');
      setStep('review');

      // Mark step 2 as completed and auto-collapse/expand sections
      setCompletedSteps((prev) => ({ ...prev, step2: true }));
      setCollapsedSections({
        step1: true,
        step2: true,
        analysisResults: false,
        extractedTexts: false,
        tokenEstimate: false,
        step3: false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setStep('setup');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  // Step 2: Generate keys with AI
  const handleGenerateKeys = async () => {
    // OpenAI key is optional if environment variable is set (checked server-side)

    if (extractedTexts.length === 0) {
      setError('No texts to generate keys for');
      return;
    }

    // Ensure Step 3 stays uncollapsed during generation
    setCollapsedSections((prev) => ({ ...prev, step3: false }));

    setLoading(true);
    setLoadingStep('generating');
    setError('');
    setStep('generating');

    try {
      // Get context sample and existing keys from jp.json
      const parsedJpJson = typeof jpJson === 'string' ? JSON.parse(jpJson) : jpJson;
      const contextSample = JSON.stringify(parsedJpJson).substring(0, 1000);
      const existingKeys = extractAllKeys(parsedJpJson);

      const generateResponse = await fetch('/api/generate-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes: extractedTexts,
          contextSample,
          openaiApiKey: openaiKey || undefined, // Optional, uses env if not provided
          existingKeys, // Pass existing keys to avoid duplicates
          useNestedKeys, // Pass nested keys preference
          userEmail, // Pass user email for usage tracking
          figmaUrl, // Pass Figma URL for usage tracking
        }),
      });

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json();
        throw new Error(errorData.error || 'Failed to generate keys');
      }

      const generateData = await generateResponse.json();
      setGeneratedKeys(generateData.data.generatedKeys);
      setStep('complete');

      // Set actual token usage
      if (generateData.data.tokenUsage) {
        setActualTokenUsage(generateData.data.tokenUsage);
      }

      // Mark step 3 as completed and keep outputs open
      setCompletedSteps((prev) => ({ ...prev, step3: true }));
      setCollapsedSections({
        step1: true,
        step2: true,
        analysisResults: false,
        extractedTexts: false,
        tokenEstimate: false,
        step3: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setStep('review');
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const handleRemoveText = (indexToRemove: number) => {
    const updatedTexts = extractedTexts.filter((_, index) => index !== indexToRemove);
    setExtractedTexts(updatedTexts);

    // Update stats to reflect the new count
    if (stats) {
      setStats({
        ...stats,
        new: updatedTexts.length,
      });
    }

    // Recalculate token estimate if we have the necessary data
    if (tokenEstimate && jpJson && updatedTexts.length > 0) {
      const parsedJpJson = typeof jpJson === 'string' ? JSON.parse(jpJson) : jpJson;
      const contextSample = JSON.stringify(parsedJpJson).substring(0, 1000);
      const existingKeys = extractAllKeys(parsedJpJson);
      const newTokenEstimate = estimateBatchTokens(
        updatedTexts as any,
        contextSample,
        existingKeys,
        10
      );
      setTokenEstimate(newTokenEstimate);
    }
  };

  const handleStartOver = () => {
    // Reset to setup step, but preserve localization files
    setStep('setup');
    setExtractedTexts([]);
    setStats(null);
    setTokenEstimate(null);
    setActualTokenUsage(null);
    setGeneratedKeys(null);
    setFilteringSummary('');
    setError('');

    // Keep step 1 completed and collapsed if files are loaded
    // Open step 2 for entering a new Figma URL
    const hasFiles = Boolean(enJson && jpJson);
    setCollapsedSections({
      step1: hasFiles, // Collapse if files are loaded
      step2: false,     // Open step 2 to enter new Figma URL
      analysisResults: false,
      extractedTexts: false,
      tokenEstimate: false,
      step3: true,
    });
    setCompletedSteps({
      step1: hasFiles,  // Keep step 1 completed if files are loaded
      step2: false,
      step3: false,
    });

    // Clear Figma URL to allow entering a new one
    setFigmaUrl('');
    setAvailablePages([]);
    setSelectedPage('');
    setExtractionMode('');
    setExtractedNodeId(null);
  };

  const toggleSection = (section: keyof typeof collapsedSections) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleAuthenticated = (email: string, role: string) => {
    setUserEmail(email);
    setUserRole(role);
    setIsAuthenticated(true);
  };

  return (
    <>
      {/* Email Authentication Modal */}
      <EmailAuthModal onAuthenticated={handleAuthenticated} />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-8 px-4">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="space-y-4">
            {/* Top Bar - User Info and Theme Toggle */}
            <div className="flex items-center justify-end gap-2 flex-wrap">
              {isAuthenticated && (
                <>
                  <Link href="/usage">
                    <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                      <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">My Usage</span>
                      <span className="sm:hidden">Usage</span>
                    </Button>
                  </Link>
                  {userRole === 'admin' && (
                    <Link href="/admin/users">
                      <Button variant="default" size="sm" className="text-xs sm:text-sm">
                        <User className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Admin Panel</span>
                        <span className="sm:hidden">Admin</span>
                      </Button>
                    </Link>
                  )}
                  <div className="flex items-center gap-2 bg-background border rounded-lg px-2 sm:px-3 py-1 sm:py-2 shadow-sm">
                    <User className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                    <span className="text-xs sm:text-sm font-medium max-w-[120px] sm:max-w-none truncate">{userEmail}</span>
                    {userRole === 'admin' && (
                      <span className="text-[10px] sm:text-xs bg-primary text-primary-foreground px-1.5 sm:px-2 py-0.5 rounded">
                        Admin
                      </span>
                    )}
                  </div>
                </>
              )}
              <ThemeToggle />
            </div>

            {/* Title */}
            <div className="text-center space-y-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                Figma i18n Key Mapper
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground px-4">
                Follow these 3 simple steps to generate i18n keys from your Figma designs
              </p>
            </div>
          </div>

        {/* Step 1: Localization Files */}
        <Card className={completedSteps.step1 ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : ''}>
          <CardHeader className="cursor-pointer" onClick={() => toggleSection('step1')}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
                  completedSteps.step1
                    ? 'bg-green-500 text-white'
                    : 'bg-primary text-primary-foreground'
                }`}>
                  1
                </div>
                {completedSteps.step1 && (
                  <div className="absolute -top-1 -right-1 bg-white dark:bg-slate-900 rounded-full p-0.5">
                    <BadgeCheck className="h-4 w-4 text-green-500" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <CardTitle className={completedSteps.step1 ? 'text-green-700 dark:text-green-400' : ''}>
                  Load Localization Files
                </CardTitle>
                <CardDescription>
                  Load your existing English and Japanese translation files to compare with new texts from Figma
                </CardDescription>
              </div>
              {collapsedSections.step1 ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
          {!collapsedSections.step1 && (
          <CardContent className="space-y-6">
            {/* Primary: Fetch from Localazy */}
            <div className={`p-6 border-2 rounded-lg space-y-3 transition-all ${
              localazyFetched
                ? 'border-green-500/50 bg-green-50 dark:bg-green-950/20'
                : 'border-primary/20 bg-primary/5'
            }`}>
              <div className="flex items-center gap-2">
                {localazyFetched ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <Zap className="h-5 w-5 text-primary" />
                )}
                <h3 className="font-semibold">
                  {localazyFetched ? 'Files Loaded Successfully!' : 'Recommended: Fetch from Localazy'}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {localazyFetched
                  ? 'Your translation files have been loaded. Ready to proceed to the next step!'
                  : 'Instantly sync with your Localazy project to get the most up-to-date translations'
                }
              </p>
              {!localazyFetched && (
                <Button
                  onClick={handleFetchFromLocalazy}
                  disabled={loading}
                  className="w-full"
                  size="lg"
                >
                  {loading && loadingStep === 'localazy' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Fetching from Localazy...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Fetch from Localazy
                    </>
                  )}
                </Button>
              )}
              {localazyFetched && (
                <div className="flex gap-2">
                  <Button
                    onClick={handleFetchFromLocalazy}
                    disabled={loading}
                    variant="outline"
                    className="flex-1"
                  >
                    Reload Files
                  </Button>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or upload files manually</span>
              </div>
            </div>

            {/* Secondary: Manual Upload */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FileUpload
                id="en-json"
                label="English JSON (en.json)"
                description="Upload your English localization file"
                onFileContent={(content, _filename) => setEnJson(content)}
              />
              <FileUpload
                id="jp-json"
                label="Japanese JSON (ja.json)"
                description="Upload your Japanese localization file"
                onFileContent={(content, _filename) => setJpJson(content)}
              />
            </div>
          </CardContent>
          )}
        </Card>

        {/* Step 2: Figma Configuration */}
        <Card className={completedSteps.step2 ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : ''}>
          <CardHeader className="cursor-pointer" onClick={() => toggleSection('step2')}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
                  completedSteps.step2
                    ? 'bg-green-500 text-white'
                    : 'bg-primary text-primary-foreground'
                }`}>
                  2
                </div>
                {completedSteps.step2 && (
                  <div className="absolute -top-1 -right-1 bg-white dark:bg-slate-900 rounded-full p-0.5">
                    <BadgeCheck className="h-4 w-4 text-green-500" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <CardTitle className={completedSteps.step2 ? 'text-green-700 dark:text-green-400' : ''}>
                  Connect Your Figma Design
                </CardTitle>
                <CardDescription>
                  Enter your Figma file link to automatically scan and extract all Japanese text from your design
                </CardDescription>
              </div>
              {collapsedSections.step2 ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
          {!collapsedSections.step2 && (
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
                Tip: Make sure your Figma file sharing is set to &quot;Anyone with the link can view&quot;
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

            <div className="space-y-2">
              <Label htmlFor="figma-token">Figma API Token (Optional)</Label>
              <Input
                id="figma-token"
                type="password"
                placeholder="Enter your token for private Figma files"
                value={figmaToken}
                onChange={(e) => setFigmaToken(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Only needed if your Figma file is private
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-start space-x-2">
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
                    Excludes icons, symbols, numbers, and exact duplicates. Disable this if you&apos;re missing expected texts.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="nested-keys"
                  checked={useNestedKeys}
                  onCheckedChange={(checked) => setUseNestedKeys(checked === true)}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="nested-keys"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Group keys by screen name
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Organizes translation keys under screen/frame names (e.g., {`{ "HomeScreen": { "title": "..." } }`})
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button
                onClick={handleExtractTexts}
                disabled={loading || !enJson || !jpJson || !figmaUrl}
                size="lg"
                className="w-full"
              >
                {loading && loadingStep === 'figma' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Extracting Texts from Figma...
                  </>
                ) : (
                  'Extract Texts from Figma'
                )}
              </Button>
            </div>
          </CardContent>
          )}
        </Card>

        {/* Analysis Results - Show after extraction */}
        {stats && (
          <Card>
            <CardHeader className="cursor-pointer" onClick={() => toggleSection('analysisResults')}>
              <div className="flex items-center justify-between">
                <CardTitle>Analysis Results</CardTitle>
                {collapsedSections.analysisResults ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
            {!collapsedSections.analysisResults && (
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
            )}
          </Card>
        )}

        {/* Extracted Texts Preview */}
        {step === 'review' && extractedTexts.length > 0 && (
          <Card>
            <CardHeader className="cursor-pointer" onClick={() => toggleSection('extractedTexts')}>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Extracted Texts - Review Before Generating</CardTitle>
                  <CardDescription>
                    These {extractedTexts.length} Japanese texts will be sent to OpenAI for key generation. Hover over any text to remove it.
                  </CardDescription>
                </div>
                {collapsedSections.extractedTexts ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
            {!collapsedSections.extractedTexts && (
            <CardContent>
              <div className="max-h-96 overflow-y-auto space-y-3">
                {extractedTexts.slice(0, 50).map((item, index) => (
                  <div
                    key={index}
                    className="group relative p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
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
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">
                          #{index + 1}
                        </span>
                        <Button
                          onClick={() => handleRemoveText(index)}
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 dark:hover:bg-red-950 hover:text-red-600 dark:hover:text-red-400"
                          title="Remove this text"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
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
            )}
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
                <Card>
                  <CardHeader className="cursor-pointer" onClick={() => toggleSection('tokenEstimate')}>
                    <div className="flex items-center justify-between">
                      <CardTitle>Estimated Token Usage</CardTitle>
                      {collapsedSections.tokenEstimate ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </CardHeader>
                  {!collapsedSections.tokenEstimate && (
                  <CardContent>
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
                      <AlertTitle>Token Usage Estimate</AlertTitle>
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
                  </CardContent>
                  )}
                </Card>
              );
            })()}
          </>
        )}

        {/* Step 3: Generate Keys with OpenAI */}
        <Card className={completedSteps.step3 ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : ''}>
          <CardHeader className="cursor-pointer" onClick={() => toggleSection('step3')}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
                  completedSteps.step3
                    ? 'bg-green-500 text-white'
                    : 'bg-primary text-primary-foreground'
                }`}>
                  3
                </div>
                {completedSteps.step3 && (
                  <div className="absolute -top-1 -right-1 bg-white dark:bg-slate-900 rounded-full p-0.5">
                    <BadgeCheck className="h-4 w-4 text-green-500" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <CardTitle className={completedSteps.step3 ? 'text-green-700 dark:text-green-400' : ''}>
                  Generate Translation Keys
                </CardTitle>
                <CardDescription>
                  AI will create meaningful, consistent translation keys for each Japanese text found in your design
                </CardDescription>
              </div>
              {collapsedSections.step3 ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
          {!collapsedSections.step3 && (
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="openai-key">OpenAI API Key (Optional)</Label>
              <Input
                id="openai-key"
                type="password"
                placeholder="Enter your OpenAI API key"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank if you've already configured your key
              </p>
            </div>

            {step === 'review' && (
              <div className="pt-4 space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-semibold">Ready to Generate!</span>
                  </div>
                  <p className="text-sm text-green-600 dark:text-green-500">
                    Found {extractedTexts.length} new Japanese texts that need translation keys
                  </p>
                </div>
                <Button
                  onClick={handleGenerateKeys}
                  disabled={loading}
                  size="lg"
                  className="w-full"
                >
                  Generate i18n Keys with AI
                </Button>
              </div>
            )}

            {step === 'generating' && (
              <div className="pt-4">
                <Button
                  disabled
                  size="lg"
                  className="w-full"
                >
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating i18n Keys with AI...
                </Button>
              </div>
            )}

          </CardContent>
          )}
        </Card>


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
          <>
            <JsonViewer
              json={generatedKeys}
              title="Generated i18n Keys"
              description="Copy or download the generated keys to use in your project"
            />
            <Card>
              <CardContent className="pt-6">
                <Button
                  onClick={handleStartOver}
                  variant="outline"
                  size="lg"
                  className="w-full"
                >
                  Process Another Figma File
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Your localization files will be preserved
                </p>
              </CardContent>
            </Card>
          </>
        )}
        </div>
      </div>
    </>
  );
}

export default function Home() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
