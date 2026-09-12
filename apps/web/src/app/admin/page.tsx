import Link from 'next/link';

export default function AdminDashboardPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <div className="flex gap-4">
        <Link
          href="/admin/companies"
          className="rounded border px-4 py-3 text-sm hover:bg-gray-50"
        >
          Manage companies →
        </Link>
        <Link href="/admin/audit" className="rounded border px-4 py-3 text-sm hover:bg-gray-50">
          View audit activity →
        </Link>
      </div>
    </div>
  );
}
