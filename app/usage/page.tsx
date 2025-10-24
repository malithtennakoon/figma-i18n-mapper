'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ThemeToggle } from '@/components/custom/theme-toggle';
import { ArrowLeft, BarChart3, Loader2, TrendingUp, DollarSign, Activity, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { formatNumber as safeFormatNumber, formatCurrency, safeDivide, safeParseNumber } from '@/lib/utils/number-format';

interface UsageLog {
  id: number;
  user_email: string;
  figma_url: string;
  extracted_texts_count: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost: number;
  created_at: string;
}

interface Stats {
  total_queries: string;
  total_tokens: string;
  total_cost: string;
  avg_cost: string;
  last_query: string;
}

export default function UsagePage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    // Check authentication
    const email = localStorage.getItem('userEmail');
    const role = localStorage.getItem('userRole');

    if (!email) {
      router.push('/');
      return;
    }

    setUserEmail(email);
    setUserRole(role || 'user');
    fetchUsageData(email);
  }, [router]);

  const fetchUsageData = async (email: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/usage?email=${encodeURIComponent(email)}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch usage data');
      }

      const data = await response.json();
      setLogs(data.data.logs || []);
      setStats(data.data.stats || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-4">
          {/* Top Bar - Back Button and Controls */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Back to Tool</span>
                <span className="sm:hidden">Back</span>
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              {userRole === 'admin' && (
                <Link href="/admin/users">
                  <Button variant="default" size="sm" className="text-xs sm:text-sm">
                    <span className="hidden sm:inline">Admin Panel</span>
                    <span className="sm:hidden">Admin</span>
                  </Button>
                </Link>
              )}
              <ThemeToggle />
            </div>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8" />
              Usage Dashboard
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Track your API usage and costs
            </p>
          </div>
        </div>

        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{userEmail}</p>
              </div>
              {userRole === 'admin' && (
                <span className="bg-primary text-primary-foreground px-3 py-1 rounded-md text-sm font-medium">
                  Admin
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        {!loading && stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Total Queries
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{safeFormatNumber(stats.total_queries)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Total Tokens
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{safeFormatNumber(stats.total_tokens)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Total Cost
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {formatCurrency(stats.total_cost)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Avg. Cost
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {formatCurrency(stats.avg_cost)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Usage History */}
        {!loading && logs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Usage History</CardTitle>
              <CardDescription>
                Your recent queries (showing last {logs.length} queries)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 border rounded-lg hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-sm text-muted-foreground">
                            {formatDate(log.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <a
                            href={log.figma_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium hover:text-primary flex items-center gap-1 truncate"
                          >
                            {log.figma_url}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Texts</p>
                            <p className="font-medium">{log.extracted_texts_count ?? 0}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Tokens</p>
                            <p className="font-medium">{safeFormatNumber(log.total_tokens)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Cost</p>
                            <p className="font-medium">{formatCurrency(log.cost)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Efficiency</p>
                            <p className="font-medium">
                              {safeFormatNumber(safeDivide(log.total_tokens, log.extracted_texts_count, 0))} tokens/text
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!loading && logs.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No usage data yet</p>
              <p className="text-muted-foreground mb-4">
                Start using the Figma i18n Key Mapper to see your usage statistics here
              </p>
              <Link href="/">
                <Button>
                  Go to Tool
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
