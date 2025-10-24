'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AddUserForm } from '@/components/admin/add-user-form';
import { UsersTable } from '@/components/admin/users-table';
import { Check, AlertCircle } from 'lucide-react';

interface User {
  id: number;
  email: string;
  role: 'admin' | 'user';
  created_at: string;
}

export default function AdminUsersPage() {
  const [userEmail, setUserEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const email = localStorage.getItem('userEmail');
    if (email) {
      setUserEmail(email);
      fetchUsers(email);
    }
  }, []);

  const fetchUsers = async (email: string) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/users?adminEmail=${encodeURIComponent(email)}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (email: string, role: 'admin' | 'user') => {
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: userEmail,
          email,
          role,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user role');
      }

      setSuccess(`User ${email} role updated to ${role}`);
      fetchUsers(userEmail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleDeleteUser = async (email: string) => {
    if (!confirm(`Are you sure you want to delete ${email}?`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const response = await fetch(
        `/api/users?adminEmail=${encodeURIComponent(userEmail)}&email=${encodeURIComponent(email)}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }

      setSuccess(`User ${email} deleted successfully`);
      fetchUsers(userEmail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
        <p className="text-muted-foreground">
          Add, remove, and manage user permissions
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950/20">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600 dark:text-green-400">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Add User Form */}
      <AddUserForm
        onUserAdded={() => fetchUsers(userEmail)}
        onError={setError}
        onSuccess={setSuccess}
        userEmail={userEmail}
      />

      {/* Users Table */}
      <UsersTable
        users={users}
        loading={loading}
        currentUserEmail={userEmail}
        onUpdateRole={handleUpdateRole}
        onDeleteUser={handleDeleteUser}
      />
    </div>
  );
}
