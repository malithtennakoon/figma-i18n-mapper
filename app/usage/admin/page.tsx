'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ThemeToggle } from '@/components/custom/theme-toggle';
import { ArrowLeft, Shield, Loader2, TrendingUp, DollarSign, Activity, Users, ExternalLink } from 'lucide-react';
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

interface UserStats {
  user_email: string;
  total_queries: string;
  total_tokens: string;
  total_cost: string;
  last_query: string;
}

export default function AdminUsagePage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [userStats, setUserStats] = useState<UserStats[]>([]);

  useEffect(() => {
    // Check authentication and admin status
    const email = localStorage.getItem('userEmail');
    const role = localStorage.getItem('userRole');

    if (!email || role !== 'admin') {
      router.push('/');
      return;
    }

    setUserEmail(email);
    fetchAdminData(email);
  }, [router]);

  const fetchAdminData = async (email: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/usage?email=${encodeURIComponent(email)}&admin=true`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch admin data');
      }

      const data = await response.json();
      setLogs(data.data.logs || []);
      setUserStats(data.data.stats || []);
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

  // Calculate total stats
  const totalStats = userStats.reduce(
    (acc, user) => ({
      totalQueries: acc.totalQueries + safeParseNumber(user.total_queries),
      totalTokens: acc.totalTokens + safeParseNumber(user.total_tokens),
      totalCost: acc.totalCost + safeParseNumber(user.total_cost),
    }),
    { totalQueries: 0, totalTokens: 0, totalCost: 0 }
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-4">
          {/* Top Bar */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Link href="/admin/users">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Back to Admin Panel</span>
                <span className="sm:hidden">Back</span>
              </Button>
            </Link>
            <ThemeToggle />
          </div>

          {/* Title */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              Admin Dashboard
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Monitor all users' usage and costs
            </p>
          </div>
        </div>

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

        {/* Overall Stats Cards */}
        {!loading && userStats.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Total Users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{userStats.length}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Total Queries
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{safeFormatNumber(totalStats.totalQueries)}</p>
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
                <p className="text-3xl font-bold">{safeFormatNumber(totalStats.totalTokens)}</p>
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
                  {formatCurrency(totalStats.totalCost)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* User Statistics */}
        {!loading && userStats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>User Statistics</CardTitle>
              <CardDescription>
                Usage breakdown by user (sorted by total cost)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userStats.map((user) => (
                  <div
                    key={user.user_email}
                    className="p-4 border rounded-lg hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <p className="font-medium">{user.user_email}</p>
                        <p className="text-sm text-muted-foreground">
                          Last activity: {formatDate(user.last_query)}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Queries</p>
                        <p className="font-medium text-lg">{safeFormatNumber(user.total_queries)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Tokens</p>
                        <p className="font-medium text-lg">{safeFormatNumber(user.total_tokens)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Cost</p>
                        <p className="font-medium text-lg">{formatCurrency(user.total_cost)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Avg. Cost/Query</p>
                        <p className="font-medium text-lg">
                          {formatCurrency(safeDivide(safeParseNumber(user.total_cost), safeParseNumber(user.total_queries)))}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity (All Users) */}
        {!loading && logs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                All users' recent queries (showing last {logs.length} queries)
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
                        <div className="flex items-center gap-3 mb-2">
                          <p className="text-sm font-medium">{log.user_email}</p>
                          <span className="text-sm text-muted-foreground">•</span>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(log.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <a
                            href={log.figma_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm hover:text-primary flex items-center gap-1 truncate"
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
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No usage data yet</p>
              <p className="text-muted-foreground">
                No users have used the tool yet
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
