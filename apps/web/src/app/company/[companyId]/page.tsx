'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api-client';

const COLUMN_TYPES = ['text', 'integer', 'bigint', 'boolean', 'date', 'timestamp', 'numeric'] as const;

interface Table {
  name: string;
}

interface NewColumn {
  name: string;
  type: (typeof COLUMN_TYPES)[number];
  nullable: boolean;
  unique: boolean;
}

function emptyColumn(): NewColumn {
  return { name: '', type: 'text', nullable: true, unique: false };
}

export default function CompanyWorkspacePage() {
  const params = useParams<{ companyId: string }>();
  const companyId = params.companyId;

  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableName, setTableName] = useState('');
  const [columns, setColumns] = useState<NewColumn[]>([emptyColumn()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    await apiFetch(`/api/v1/companies/${companyId}/workspace`); // provisions the workspace on first visit
    const res = await apiFetch(`/api/v1/companies/${companyId}/workspace/tables`);
    setTables(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    if (companyId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  function updateColumn(index: number, patch: Partial<NewColumn>) {
    setColumns((cols) => cols.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  async function handleCreateTable(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await apiFetch(`/api/v1/companies/${companyId}/workspace/tables`, {
        method: 'POST',
        body: JSON.stringify({ name: tableName, columns }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Failed to create table');
      }
      setTableName('');
      setColumns([emptyColumn()]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create table');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteTable(name: string) {
    if (!confirm(`Delete table "${name}"? This cannot be undone.`)) return;
    setBusy(true);
    await apiFetch(`/api/v1/companies/${companyId}/workspace/tables/${name}`, {
      method: 'DELETE',
      body: JSON.stringify({ confirm: true }),
    });
    await load();
    setBusy(false);
  }

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-xl font-semibold">Tables</h1>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-gray-500">
              <th className="py-2">Name</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {tables.map((table) => (
              <tr key={table.name} className="border-b">
                <td className="py-2">
                  <Link href={`/company/${companyId}/tables/${table.name}`} className="underline">
                    {table.name}
                  </Link>
                </td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => handleDeleteTable(table.name)}
                    disabled={busy}
                    className="text-red-600 hover:underline disabled:opacity-50"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {tables.length === 0 && (
              <tr>
                <td colSpan={2} className="py-4 text-center text-gray-400">
                  No tables yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      <section className="space-y-3 border-t pt-6">
        <h2 className="font-medium">Create a table</h2>
        <form onSubmit={handleCreateTable} className="space-y-3">
          <input
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            placeholder="Table name"
            required
            className="w-full rounded border px-3 py-2 text-sm"
          />

          <div className="space-y-2">
            {columns.map((col, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={col.name}
                  onChange={(e) => updateColumn(i, { name: e.target.value })}
                  placeholder="Column name"
                  required
                  className="flex-1 rounded border px-3 py-2 text-sm"
                />
                <select
                  value={col.type}
                  onChange={(e) => updateColumn(i, { type: e.target.value as NewColumn['type'] })}
                  className="rounded border px-2 py-2 text-sm"
                >
                  {COLUMN_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={!col.nullable}
                    onChange={(e) => updateColumn(i, { nullable: !e.target.checked })}
                  />
                  required
                </label>
                <label className="flex items-center gap-1 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={col.unique}
                    onChange={(e) => updateColumn(i, { unique: e.target.checked })}
                  />
                  unique
                </label>
                <button
                  type="button"
                  onClick={() => setColumns((cols) => cols.filter((_, idx) => idx !== i))}
                  disabled={columns.length === 1}
                  className="text-gray-400 hover:text-red-600 disabled:opacity-30"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setColumns((cols) => [...cols, emptyColumn()])}
              className="text-sm text-gray-600 hover:underline"
            >
              + Add column
            </button>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {busy ? 'Creating…' : 'Create table'}
          </button>
        </form>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </section>
    </div>
  );
}
