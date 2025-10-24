import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, addUser, updateUserRole, deleteUser, bulkAddUsers, isAdmin } from '@/lib/db';

// GET - Get all users (admin only)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const adminEmail = searchParams.get('adminEmail');

    if (!adminEmail || !isAdmin(adminEmail)) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }

    const users = await getAllUsers();

    return NextResponse.json({
      success: true,
      data: { users },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'An error occurred while fetching users',
      },
      { status: 500 }
    );
  }
}

// POST - Add new user or bulk add users (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adminEmail, email, emails, role = 'user' } = body;

    if (!adminEmail || !isAdmin(adminEmail)) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }

    // Bulk add
    if (emails && Array.isArray(emails)) {
      const results = await bulkAddUsers(emails, role);
      return NextResponse.json({
        success: true,
        data: results,
      });
    }

    // Single add
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const user = await addUser(email, role);

    return NextResponse.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('Error adding user:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'An error occurred while adding user',
      },
      { status: 500 }
    );
  }
}

// PATCH - Update user role (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { adminEmail, email, role } = body;

    if (!adminEmail || !isAdmin(adminEmail)) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      );
    }

    if (role !== 'admin' && role !== 'user') {
      return NextResponse.json(
        { error: 'Role must be either "admin" or "user"' },
        { status: 400 }
      );
    }

    const user = await updateUserRole(email, role);

    return NextResponse.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'An error occurred while updating user role',
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete user (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const adminEmail = searchParams.get('adminEmail');
    const email = searchParams.get('email');

    if (!adminEmail || !isAdmin(adminEmail)) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const user = await deleteUser(email);

    return NextResponse.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'An error occurred while deleting user',
      },
      { status: 500 }
    );
  }
}
