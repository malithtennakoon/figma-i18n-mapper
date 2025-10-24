'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Loader2 } from 'lucide-react';

interface AddUserFormProps {
  onUserAdded: () => void;
  onError: (error: string) => void;
  onSuccess: (message: string) => void;
  userEmail: string;
}

export function AddUserForm({ onUserAdded, onError, onSuccess, userEmail }: AddUserFormProps) {
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');
  const [addingUser, setAddingUser] = useState(false);

  const handleAddUser = async () => {
    if (!newUserEmail.trim()) {
      onError('Email is required');
      return;
    }

    setAddingUser(true);
    onError('');

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminEmail: userEmail,
          email: newUserEmail,
          role: newUserRole,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add user');
      }

      onSuccess(`User ${newUserEmail} added successfully!`);
      setNewUserEmail('');
      setNewUserRole('user');
      onUserAdded();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setAddingUser(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New User</CardTitle>
        <CardDescription>Add a user to the system</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@habitto.com"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              disabled={addingUser}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddUser();
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={newUserRole} onValueChange={(value: 'admin' | 'user') => setNewUserRole(value)}>
              <SelectTrigger id="role" disabled={addingUser}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-3 pt-2">
            <Button onClick={handleAddUser} disabled={addingUser} className="w-full sm:w-auto">
              {addingUser ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
