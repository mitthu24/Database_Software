'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/firebase/auth-context';
import { apiFetch } from '@/lib/api-client';

interface AppIdentity {
  userId: string;
  email: string;
  isPlatformAdmin: boolean;
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [identity, setIdentity] = useState<AppIdentity | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    apiFetch('/api/v1/auth/me')
      .then((res) => res.json())
      .then((data) => setIdentity(data.identity))
      .finally(() => setChecking(false));
  }, [user, loading, router]);

  if (loading || checking) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-500">Loading…</p>
      </main>
    );
  }

  if (!identity?.isPlatformAdmin) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-2 p-8 text-center">
        <h1 className="text-lg font-semibold">Not authorized</h1>
        <p className="text-sm text-gray-500">
          Your account does not have Super Admin access.
        </p>
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      <nav className="flex items-center gap-4 border-b px-6 py-3 text-sm">
        <span className="font-semibold">Super Admin</span>
        <Link href="/admin/companies" className="text-gray-600 hover:underline">
          Companies
        </Link>
        <Link href="/admin/audit" className="text-gray-600 hover:underline">
          Audit
        </Link>
        <span className="ml-auto text-gray-400">{identity.email}</span>
      </nav>
      <div className="p-6">{children}</div>
    </div>
  );
}
