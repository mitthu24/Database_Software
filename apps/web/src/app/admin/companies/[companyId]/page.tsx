'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';

interface Company {
  id: string;
  name: string;
  slug: string;
  status: string;
}

interface CompanyAdmin {
  userId: string;
  email: string;
  displayName: string | null;
  membershipStatus: string;
}

export default function CompanyDetailPage() {
  const params = useParams<{ companyId: string }>();
  const companyId = params.companyId;

  const [company, setCompany] = useState<Company | null>(null);
  const [admins, setAdmins] = useState<CompanyAdmin[]>([]);
  const [name, setName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const [companyRes, adminsRes] = await Promise.all([
      apiFetch(`/api/v1/companies/${companyId}`),
      apiFetch(`/api/v1/companies/${companyId}/admins`),
    ]);
    const companyData = await companyRes.json();
    setCompany(companyData);
    setName(companyData.name);
    setAdmins(await adminsRes.json());
  }

  useEffect(() => {
    if (companyId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  async function handleRename(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    await apiFetch(`/api/v1/companies/${companyId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
    await load();
    setBusy(false);
  }

  async function handleStatusChange(nextStatus: 'active' | 'suspended') {
    setBusy(true);
    await apiFetch(`/api/v1/companies/${companyId}/${nextStatus === 'active' ? 'activate' : 'suspend'}`, {
      method: 'POST',
    });
    await load();
    setBusy(false);
  }

  async function handleInvite(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    setBusy(true);
    try {
      const res = await apiFetch(`/api/v1/companies/${companyId}/admins`, {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Failed to invite admin');
      }
      setInviteEmail('');
      setMessage('Invite sent.');
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to invite admin');
    } finally {
      setBusy(false);
    }
  }

  if (!company) {
    return <p className="text-sm text-gray-500">Loading…</p>;
  }

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold">{company.name}</h1>
        <p className="text-sm text-gray-500">
          {company.slug} · <span>{company.status}</span>
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="font-medium">Rename</h2>
        <form onSubmit={handleRename} className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded border px-4 py-2 text-sm disabled:opacity-50"
          >
            Save
          </button>
        </form>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Status</h2>
        {company.status === 'active' ? (
          <button
            onClick={() => handleStatusChange('suspended')}
            disabled={busy}
            className="rounded border border-red-300 px-4 py-2 text-sm text-red-600 disabled:opacity-50"
          >
            Suspend company
          </button>
        ) : (
          <button
            onClick={() => handleStatusChange('active')}
            disabled={busy}
            className="rounded border border-green-300 px-4 py-2 text-sm text-green-700 disabled:opacity-50"
          >
            Activate company
          </button>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Company administrators</h2>
        <ul className="space-y-1 text-sm">
          {admins.map((admin) => (
            <li key={admin.userId} className="flex justify-between border-b py-1">
              <span>{admin.email}</span>
              <span className="text-gray-500">{admin.membershipStatus}</span>
            </li>
          ))}
          {admins.length === 0 && <li className="text-gray-400">No admins yet.</li>}
        </ul>

        <form onSubmit={handleInvite} className="flex gap-2">
          <input
            type="email"
            placeholder="admin@company.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
            className="flex-1 rounded border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            Invite
          </button>
        </form>
        {message && <p className="text-sm text-gray-600">{message}</p>}
      </section>
    </div>
  );
}
