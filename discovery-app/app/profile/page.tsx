import Link from 'next/link';

export default function ProfilePage() {
  return (
    <div className="max-w-xl mx-auto mt-12 p-8 bg-white rounded-2xl shadow-md border border-gray-100 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">User Profile</h1>
        <p className="mt-1 text-gray-500">Manage your profile, settings, and health status.</p>
      </div>

      <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row gap-4">
        <Link
          href="/health"
          className="flex-1 text-center bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-semibold px-4 py-3 rounded-xl transition-colors border border-emerald-200"
        >
          ❤️ Health Status Page
        </Link>
      </div>
    </div>
  );
}
