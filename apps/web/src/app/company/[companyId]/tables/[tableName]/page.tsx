'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch } from '@/lib/api-client';

const COLUMN_TYPES = ['text', 'integer', 'bigint', 'boolean', 'date', 'timestamp', 'numeric'] as const;

interface Column {
  name: string;
  type: (typeof COLUMN_TYPES)[number] | null;
  nullable: boolean;
  unique: boolean;
  isSystemColumn: boolean;
  displayOrder: number;
}

export default function TableDetailPage() {
  const params = useParams<{ companyId: string; tableName: string }>();
  const { companyId, tableName } = params;

  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<(typeof COLUMN_TYPES)[number]>('text');
  const [newRequired, setNewRequired] = useState(false);
  const [newUnique, setNewUnique] = useState(false);

  const basePath = `/api/v1/companies/${companyId}/workspace/tables/${tableName}`;

  async function load() {
    setLoading(true);
    const res = await apiFetch(basePath);
    const data = await res.json();
    setColumns(data.columns ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (companyId && tableName) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, tableName]);

  async function handleAddColumn(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await apiFetch(`${basePath}/columns`, {
        method: 'POST',
        body: JSON.stringify({ name: newName, type: newType, nullable: !newRequired, unique: newUnique }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Failed to add column');
      }
      setNewName('');
      setNewType('text');
      setNewRequired(false);
      setNewUnique(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add column');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteColumn(name: string) {
    if (!confirm(`Delete column "${name}"? This cannot be undone.`)) return;
    setBusy(true);
    await apiFetch(`${basePath}/columns/${name}`, {
      method: 'DELETE',
      body: JSON.stringify({ confirm: true }),
    });
    await load();
    setBusy(false);
  }

  async function handleRenameColumn(oldName: string) {
    const nextName = prompt('New column name', oldName);
    if (!nextName || nextName === oldName) return;
    setBusy(true);
    await apiFetch(`${basePath}/columns/${oldName}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: nextName }),
    });
    await load();
    setBusy(false);
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const userColumns = columns.filter((c) => !c.isSystemColumn);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= userColumns.length) return;
    const order = userColumns.map((c) => c.name);
    [order[index], order[targetIndex]] = [order[targetIndex], order[index]];
    setBusy(true);
    await apiFetch(`${basePath}/columns/reorder`, {
      method: 'POST',
      body: JSON.stringify({ order }),
    });
    await load();
    setBusy(false);
  }

  const userColumns = columns.filter((c) => !c.isSystemColumn);

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-xl font-semibold">{tableName}</h1>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-gray-500">
              <th className="py-2">Name</th>
              <th className="py-2">Type</th>
              <th className="py-2">Required</th>
              <th className="py-2">Unique</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {columns.map((col) => {
              const userIndex = userColumns.findIndex((c) => c.name === col.name);
              return (
                <tr key={col.name} className="border-b">
                  <td className="py-2">
                    {col.name}
                    {col.isSystemColumn && <span className="ml-1 text-xs text-gray-400">(system)</span>}
                  </td>
                  <td className="py-2 text-gray-500">{col.type ?? '—'}</td>
                  <td className="py-2">{col.nullable ? '' : '✓'}</td>
                  <td className="py-2">{col.unique ? '✓' : ''}</td>
                  <td className="py-2 text-right space-x-2">
                    {!col.isSystemColumn && (
                      <>
                        <button
                          onClick={() => handleMove(userIndex, -1)}
                          disabled={busy || userIndex === 0}
                          className="text-gray-500 hover:underline disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => handleMove(userIndex, 1)}
                          disabled={busy || userIndex === userColumns.length - 1}
                          className="text-gray-500 hover:underline disabled:opacity-30"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => handleRenameColumn(col.name)}
                          disabled={busy}
                          className="text-gray-600 hover:underline disabled:opacity-50"
                        >
                          Rename
                        </button>
                        <button
                          onClick={() => handleDeleteColumn(col.name)}
                          disabled={busy}
                          className="text-red-600 hover:underline disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <section className="space-y-3 border-t pt-6">
        <h2 className="font-medium">Add a column</h2>
        <form onSubmit={handleAddColumn} className="flex items-center gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Column name"
            required
            className="flex-1 rounded border px-3 py-2 text-sm"
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as (typeof COLUMN_TYPES)[number])}
            className="rounded border px-2 py-2 text-sm"
          >
            {COLUMN_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-xs text-gray-600">
            <input type="checkbox" checked={newRequired} onChange={(e) => setNewRequired(e.target.checked)} />
            required
          </label>
          <label className="flex items-center gap-1 text-xs text-gray-600">
            <input type="checkbox" checked={newUnique} onChange={(e) => setNewUnique(e.target.checked)} />
            unique
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            Add
          </button>
        </form>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </section>
    </div>
  );
}
