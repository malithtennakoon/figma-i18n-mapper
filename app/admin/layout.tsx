'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/custom/theme-toggle';
import { Shield, Users, BarChart3, ArrowLeft, Home } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check authentication and admin status
    const email = localStorage.getItem('userEmail');
    const role = localStorage.getItem('userRole');

    if (!email || role !== 'admin') {
      router.push('/');
      return;
    }

    setUserEmail(email);
    setIsAdmin(true);
  }, [router]);

  if (!isAdmin) {
    return null; // Don't render until we verify admin status
  }

  const navItems = [
    {
      href: '/admin/users',
      label: 'User Management',
      icon: Users,
      active: pathname === '/admin/users',
    },
    {
      href: '/usage/admin',
      label: 'Usage Analytics',
      icon: BarChart3,
      active: pathname === '/usage/admin',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <Home className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Back to Tool</span>
                  <span className="sm:hidden">Home</span>
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                <div>
                  <h1 className="text-lg sm:text-xl font-bold">Admin Panel</h1>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    {userEmail}
                  </p>
                </div>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b bg-background/50">
        <div className="container mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={item.active ? 'default' : 'ghost'}
                  size="sm"
                  className="gap-2 rounded-b-none"
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
