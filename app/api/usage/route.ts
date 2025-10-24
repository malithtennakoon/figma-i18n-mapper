import { NextRequest, NextResponse } from 'next/server';
import { getUserUsageLogs, getUserStats, getAllUsageLogs, getAllUsersStats, isAdmin } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email');
    const isAdminView = searchParams.get('admin') === 'true';

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // If admin view is requested, verify user is admin
    if (isAdminView && !isAdmin(email)) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }

    if (isAdminView) {
      // Return all users' data for admin
      const [allLogs, allStats] = await Promise.all([
        getAllUsageLogs(100),
        getAllUsersStats(),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          logs: allLogs,
          stats: allStats,
        },
      });
    } else {
      // Return user's own data
      const [userLogs, userStats] = await Promise.all([
        getUserUsageLogs(email, 50),
        getUserStats(email),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          logs: userLogs,
          stats: userStats,
        },
      });
    }
  } catch (error) {
    console.error('Error fetching usage data:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'An error occurred while fetching usage data',
      },
      { status: 500 }
    );
  }
}
