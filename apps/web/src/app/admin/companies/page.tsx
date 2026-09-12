'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api-client';

interface Company {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await apiFetch('/api/v1/companies');
    setCompanies(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const res = await apiFetch('/api/v1/companies', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Failed to create company');
      }
      setName('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create company');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Companies</h1>

      <form onSubmit={handleCreate} className="flex items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm font-medium">
            New company name
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="rounded border px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={creating}
          className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {creating ? 'Creating…' : 'Create'}
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-gray-500">
              <th className="py-2">Name</th>
              <th className="py-2">Slug</th>
              <th className="py-2">Status</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <tr key={company.id} className="border-b">
                <td className="py-2">{company.name}</td>
                <td className="py-2 text-gray-500">{company.slug}</td>
                <td className="py-2">
                  <span
                    className={
                      company.status === 'active' ? 'text-green-600' : 'text-red-600'
                    }
                  >
                    {company.status}
                  </span>
                </td>
                <td className="py-2">
                  <Link href={`/admin/companies/${company.id}`} className="underline">
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
            {companies.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-center text-gray-400">
                  No companies yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
