'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api-client';

interface AuditEvent {
  id: string;
  actorUserId: string;
  companyId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  createdAt: string;
}

export default function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/v1/audit')
      .then((res) => res.json())
      .then(setEvents)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Audit activity</h1>
      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-gray-500">
              <th className="py-2">When</th>
              <th className="py-2">Action</th>
              <th className="py-2">Resource</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-b">
                <td className="py-2 text-gray-500">
                  {new Date(event.createdAt).toLocaleString()}
                </td>
                <td className="py-2">{event.action}</td>
                <td className="py-2 text-gray-500">
                  {event.resourceType}
                  {event.resourceId ? ` · ${event.resourceId}` : ''}
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={3} className="py-4 text-center text-gray-400">
                  No activity yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
