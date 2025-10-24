'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, AlertCircle } from 'lucide-react';

interface EmailAuthModalProps {
  onAuthenticated: (email: string, role: string) => void;
}

export function EmailAuthModal({ onAuthenticated }: EmailAuthModalProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if user is already authenticated
    const storedEmail = localStorage.getItem('userEmail');
    const storedRole = localStorage.getItem('userRole');

    if (storedEmail && storedRole) {
      // Verify the stored email is still valid
      verifyStoredEmail(storedEmail, storedRole);
    } else {
      // Show modal if not authenticated
      setOpen(true);
    }
  }, []);

  const verifyStoredEmail = async (storedEmail: string, storedRole: string) => {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: storedEmail }),
      });

      if (response.ok) {
        // Email is still valid, authenticate silently
        onAuthenticated(storedEmail, storedRole);
      } else {
        // Stored email is no longer valid, clear and show modal
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userRole');
        setOpen(true);
      }
    } catch (err) {
      // On error, show modal to re-authenticate
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userRole');
      setOpen(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || data.error || 'Authentication failed');
        return;
      }

      // Store email and role in localStorage
      localStorage.setItem('userEmail', data.user.email);
      localStorage.setItem('userRole', data.user.role);

      // Close modal and notify parent
      setOpen(false);
      onAuthenticated(data.user.email, data.user.role);
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Welcome to Figma i18n Key Mapper
          </DialogTitle>
          <DialogDescription>
            Please enter your company email to access this tool
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="your.email@habitto.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Use your @habitto.com or @rhino-partners.com email address
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              'Continue'
            )}
          </Button>

          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>Only authorized company members can access this tool.</p>
            <p className="font-medium">
              If you don&apos;t have a company email, please contact your administrator.
            </p>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
