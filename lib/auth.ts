/**
 * Server-side authentication utilities
 * IMPORTANT: Never trust client-side data for authorization
 */

import { isUserInDatabase, isAdmin } from './db';

export interface AuthResult {
  authenticated: boolean;
  email?: string;
  role?: 'admin' | 'user';
  error?: string;
}

/**
 * Verify user email from request body
 * This validates the email exists in the database
 * NEVER trust client-side localStorage or state
 */
export async function verifyUserEmail(email: string | null | undefined): Promise<AuthResult> {
  // Check email is provided
  if (!email || typeof email !== 'string') {
    return {
      authenticated: false,
      error: 'Email is required',
    };
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    return {
      authenticated: false,
      error: 'Invalid email format',
    };
  }

  // Check if user exists in database
  const userExists = await isUserInDatabase(normalizedEmail);
  if (!userExists) {
    return {
      authenticated: false,
      error: 'User not found. Please contact your administrator to get access.',
    };
  }

  // Determine role
  const role = isAdmin(normalizedEmail) ? 'admin' : 'user';

  return {
    authenticated: true,
    email: normalizedEmail,
    role,
  };
}

/**
 * Verify admin access
 */
export async function verifyAdminAccess(email: string | null | undefined): Promise<AuthResult> {
  const authResult = await verifyUserEmail(email);

  if (!authResult.authenticated) {
    return authResult;
  }

  if (authResult.role !== 'admin') {
    return {
      authenticated: false,
      error: 'Unauthorized: Admin access required',
    };
  }

  return authResult;
}
