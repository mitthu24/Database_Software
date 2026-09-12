'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/firebase/auth-context';
import { apiFetch } from '@/lib/api-client';

interface Membership {
  companyId: string;
  role: string;
  status: string;
}

export default function HomePage() {
  const { user, loading, signOut } = useAuth();
  const [apiResult, setApiResult] = useState<string | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [memberships, setMemberships] = useState<Membership[]>([]);

  useEffect(() => {
    if (!user) return;
    apiFetch('/api/v1/auth/me')
      .then((res) => res.json())
      .then((data) => {
        setApiResult(JSON.stringify(data));
        setIsPlatformAdmin(Boolean(data.identity?.isPlatformAdmin));
        setMemberships(data.identity?.memberships ?? []);
      })
      .catch(() => setApiResult('API call failed — is apps/api running?'));
  }, [user]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-2xl font-semibold">Database Software</h1>
      <p className="text-sm text-gray-500">Manage your companies and their table structures.</p>

      {user ? (
        <div className="space-y-3">
          <p className="text-sm">Signed in as {user.email}</p>
          {apiResult && <p className="text-xs text-gray-400">/auth/me → {apiResult}</p>}

          {memberships.filter((m) => m.status === 'active').length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500">Your workspaces</p>
              {memberships
                .filter((m) => m.status === 'active')
                .map((m) => (
                  <div key={m.companyId}>
                    <a href={`/company/${m.companyId}`} className="text-sm underline">
                      Workspace ({m.role})
                    </a>
                  </div>
                ))}
            </div>
          )}

          <div className="flex justify-center gap-3">
            {isPlatformAdmin && (
              <a href="/admin" className="text-sm underline">
                Admin panel
              </a>
            )}
            <button onClick={() => signOut()} className="text-sm underline">
              Sign out
            </button>
          </div>
        </div>
      ) : (
        <a href="/login" className="text-sm underline">
          Sign in
        </a>
      )}
    </main>
  );
}
