import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if user exists in database (or auto-create for main admin)
    // All other users must be added by an admin through the admin panel
    const user = await getOrCreateUser(email);

    return NextResponse.json({
      success: true,
      user: {
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error verifying email:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'An error occurred while verifying email',
      },
      { status: 500 }
    );
  }
}
