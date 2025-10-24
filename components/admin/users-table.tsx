'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users as UsersIcon, Trash2, Loader2, Shield, User } from 'lucide-react';

interface User {
  id: number;
  email: string;
  role: 'admin' | 'user';
  created_at: string;
}

interface UsersTableProps {
  users: User[];
  loading: boolean;
  currentUserEmail: string;
  onUpdateRole: (email: string, role: 'admin' | 'user') => void;
  onDeleteUser: (email: string) => void;
}

export function UsersTable({
  users,
  loading,
  currentUserEmail,
  onUpdateRole,
  onDeleteUser,
}: UsersTableProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              Users ({users.length})
            </CardTitle>
            <CardDescription>Manage existing users and their roles</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <UsersIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No users found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Admins</p>
                <p className="text-2xl font-bold flex items-center gap-2">
                  {users.filter((u) => u.role === 'admin').length}
                  <Shield className="h-4 w-4 text-primary" />
                </p>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm text-muted-foreground">Regular Users</p>
                <p className="text-2xl font-bold flex items-center gap-2">
                  {users.filter((u) => u.role === 'user').length}
                  <User className="h-4 w-4 text-muted-foreground" />
                </p>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {user.email}
                          {user.email === currentUserEmail && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                              You
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(value: 'admin' | 'user') => onUpdateRole(user.email, value)}
                          disabled={user.email === currentUserEmail}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">
                              <div className="flex items-center gap-2">
                                <User className="h-3 w-3" />
                                User
                              </div>
                            </SelectItem>
                            <SelectItem value="admin">
                              <div className="flex items-center gap-2">
                                <Shield className="h-3 w-3" />
                                Admin
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(user.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteUser(user.email)}
                          disabled={user.email === currentUserEmail}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          title={user.email === currentUserEmail ? "You cannot delete yourself" : "Delete user"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
