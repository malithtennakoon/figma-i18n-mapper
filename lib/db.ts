import { sql } from '@vercel/postgres';

export interface User {
  id: number;
  email: string;
  role: 'admin' | 'user';
  created_at: Date;
}

export interface UsageLog {
  id: number;
  user_email: string;
  figma_url: string;
  extracted_texts_count: number;
  extracted_texts_sample: string; // JSON string with sample texts
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost: number;
  created_at: Date;
}

// Admin email - this is the only hardcoded admin
// All other users are managed through the admin panel
const ADMIN_EMAIL = 'malith.tennakoon@rhino-partners.com';

export function isAdmin(email: string): boolean {
  return email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase();
}

// Check if user exists in database
export async function isUserInDatabase(email: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();

  try {
    const result = await sql`
      SELECT email FROM users WHERE email = ${normalizedEmail}
    `;
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking user in database:', error);
    return false;
  }
}

// Initialize database tables
export async function initializeDatabase() {
  try {
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(10) NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create usage_logs table
    await sql`
      CREATE TABLE IF NOT EXISTS usage_logs (
        id SERIAL PRIMARY KEY,
        user_email VARCHAR(255) NOT NULL,
        figma_url TEXT NOT NULL,
        extracted_texts_count INTEGER NOT NULL,
        extracted_texts_sample TEXT,
        prompt_tokens INTEGER NOT NULL,
        completion_tokens INTEGER NOT NULL,
        total_tokens INTEGER NOT NULL,
        cost DECIMAL(10, 6) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create index on user_email for faster queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_usage_logs_user_email
      ON usage_logs(user_email)
    `;

    // Create index on created_at for time-based queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at
      ON usage_logs(created_at DESC)
    `;

    console.log('Database initialized successfully');
    return { success: true };
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Get or create user
export async function getOrCreateUser(email: string) {
  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Try to initialize database tables if they don't exist
    try {
      await initializeDatabase();
    } catch (initError) {
      // Tables might already exist, continue
      console.log('Database initialization skipped (tables may already exist)');
    }

    // Check if user exists in database
    const existingUser = await sql`
      SELECT * FROM users WHERE email = ${normalizedEmail}
    `;

    if (existingUser.rows.length > 0) {
      return existingUser.rows[0] as User;
    }

    // User doesn't exist in database
    // Only allow the main admin to auto-register
    if (isAdmin(normalizedEmail)) {
      const newUser = await sql`
        INSERT INTO users (email, role)
        VALUES (${normalizedEmail}, 'admin')
        RETURNING *
      `;
      return newUser.rows[0] as User;
    }

    // All other users must be added by an admin through the admin panel
    throw new Error('User not found. Please contact your administrator to get access.');

  } catch (error) {
    console.error('Error getting or creating user:', error);

    // Provide user-friendly error messages
    if (error instanceof Error) {
      if (error.message.includes('User not found')) {
        throw error;
      }
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        throw new Error('Database is not set up yet. Please contact your administrator.');
      }
      if (error.message.includes('connect') || error.message.includes('ECONNREFUSED')) {
        throw new Error('Unable to connect to the database. Please try again later.');
      }
    }

    throw new Error('Unable to verify your email at this time. Please try again later.');
  }
}

// Log usage
export async function logUsage(data: {
  userEmail: string;
  figmaUrl: string;
  extractedTextsCount: number;
  extractedTextsSample: any[];
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
}) {
  try {
    // Sample first 5 texts for storage
    const sample = data.extractedTextsSample.slice(0, 5);
    const sampleJson = JSON.stringify(sample);

    const result = await sql`
      INSERT INTO usage_logs (
        user_email,
        figma_url,
        extracted_texts_count,
        extracted_texts_sample,
        prompt_tokens,
        completion_tokens,
        total_tokens,
        cost
      )
      VALUES (
        ${data.userEmail},
        ${data.figmaUrl},
        ${data.extractedTextsCount},
        ${sampleJson},
        ${data.promptTokens},
        ${data.completionTokens},
        ${data.totalTokens},
        ${data.cost}
      )
      RETURNING *
    `;

    return result.rows[0] as UsageLog;
  } catch (error) {
    console.error('Error logging usage:', error);
    // Don't throw - usage logging should not break the main flow
    // Just log the error and return null
    return null;
  }
}

// Get user's usage logs
export async function getUserUsageLogs(email: string, limit = 50) {
  try {
    const result = await sql`
      SELECT * FROM usage_logs
      WHERE user_email = ${email.toLowerCase().trim()}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    return result.rows as UsageLog[];
  } catch (error) {
    console.error('Error getting user usage logs:', error);
    // Return empty array if table doesn't exist yet
    if (error instanceof Error && error.message.includes('relation')) {
      return [];
    }
    throw new Error('Unable to load usage data. Please try again later.');
  }
}

// Get all usage logs (admin only)
export async function getAllUsageLogs(limit = 100) {
  try {
    const result = await sql`
      SELECT * FROM usage_logs
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    return result.rows as UsageLog[];
  } catch (error) {
    console.error('Error getting all usage logs:', error);
    // Return empty array if table doesn't exist yet
    if (error instanceof Error && error.message.includes('relation')) {
      return [];
    }
    throw new Error('Unable to load usage data. Please try again later.');
  }
}

// Get user statistics
export async function getUserStats(email: string) {
  try {
    const result = await sql`
      SELECT
        COUNT(*) as total_queries,
        SUM(total_tokens) as total_tokens,
        SUM(cost) as total_cost,
        AVG(cost) as avg_cost,
        MAX(created_at) as last_query
      FROM usage_logs
      WHERE user_email = ${email.toLowerCase().trim()}
    `;

    return result.rows[0];
  } catch (error) {
    console.error('Error getting user stats:', error);
    // Return empty stats if table doesn't exist yet
    if (error instanceof Error && error.message.includes('relation')) {
      return {
        total_queries: '0',
        total_tokens: '0',
        total_cost: '0',
        avg_cost: '0',
        last_query: null,
      };
    }
    throw new Error('Unable to load usage statistics. Please try again later.');
  }
}

// Get all users statistics (admin only)
export async function getAllUsersStats() {
  try {
    const result = await sql`
      SELECT
        user_email,
        COUNT(*) as total_queries,
        SUM(total_tokens) as total_tokens,
        SUM(cost) as total_cost,
        MAX(created_at) as last_query
      FROM usage_logs
      GROUP BY user_email
      ORDER BY total_cost DESC
    `;

    return result.rows;
  } catch (error) {
    console.error('Error getting all users stats:', error);
    // Return empty array if table doesn't exist yet
    if (error instanceof Error && error.message.includes('relation')) {
      return [];
    }
    throw new Error('Unable to load usage statistics. Please try again later.');
  }
}

// Get all users (admin only)
export async function getAllUsers() {
  try {
    const result = await sql`
      SELECT id, email, role, created_at
      FROM users
      ORDER BY created_at DESC
    `;

    return result.rows as User[];
  } catch (error) {
    console.error('Error getting all users:', error);
    // Return empty array if table doesn't exist yet
    if (error instanceof Error && error.message.includes('relation')) {
      return [];
    }
    throw new Error('Unable to load users. Please try again later.');
  }
}

// Add new user (admin only)
export async function addUser(email: string, role: 'admin' | 'user' = 'user') {
  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Check if user already exists
    const existingUser = await sql`
      SELECT * FROM users WHERE email = ${normalizedEmail}
    `;

    if (existingUser.rows.length > 0) {
      throw new Error('User already exists');
    }

    const newUser = await sql`
      INSERT INTO users (email, role)
      VALUES (${normalizedEmail}, ${role})
      RETURNING *
    `;

    return newUser.rows[0] as User;
  } catch (error) {
    console.error('Error adding user:', error);
    if (error instanceof Error && error.message === 'User already exists') {
      throw error;
    }
    throw new Error('Unable to add user. Please try again later.');
  }
}

// Update user role (admin only)
export async function updateUserRole(email: string, role: 'admin' | 'user') {
  const normalizedEmail = email.toLowerCase().trim();

  try {
    const result = await sql`
      UPDATE users
      SET role = ${role}
      WHERE email = ${normalizedEmail}
      RETURNING *
    `;

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    return result.rows[0] as User;
  } catch (error) {
    console.error('Error updating user role:', error);
    if (error instanceof Error && error.message === 'User not found') {
      throw error;
    }
    throw new Error('Unable to update user role. Please try again later.');
  }
}

// Delete user (admin only)
export async function deleteUser(email: string) {
  const normalizedEmail = email.toLowerCase().trim();

  // Prevent deleting the main admin
  if (normalizedEmail === ADMIN_EMAIL.toLowerCase()) {
    throw new Error('Cannot delete the main admin account');
  }

  try {
    const result = await sql`
      DELETE FROM users
      WHERE email = ${normalizedEmail}
      RETURNING *
    `;

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    return result.rows[0] as User;
  } catch (error) {
    console.error('Error deleting user:', error);
    if (error instanceof Error && (error.message === 'User not found' || error.message.includes('Cannot delete'))) {
      throw error;
    }
    throw new Error('Unable to delete user. Please try again later.');
  }
}

// Bulk add users (admin only)
export async function bulkAddUsers(emails: string[], role: 'admin' | 'user' = 'user') {
  const results = {
    added: [] as string[],
    existing: [] as string[],
    failed: [] as string[],
  };

  for (const email of emails) {
    const normalizedEmail = email.toLowerCase().trim();

    try {
      await addUser(normalizedEmail, role);
      results.added.push(normalizedEmail);
    } catch (error) {
      if (error instanceof Error && error.message === 'User already exists') {
        results.existing.push(normalizedEmail);
      } else {
        results.failed.push(normalizedEmail);
      }
    }
  }

  return results;
}
