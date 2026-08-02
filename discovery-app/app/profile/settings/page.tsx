import Link from 'next/link';

export default function SettingsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4">
      <h1 className="text-3xl font-bold text-gray-800">Settings Page</h1>
      <p className="text-lg text-gray-500">Settings page coming soon...</p>
      <Link href="/profile" className="text-sm text-blue-600 hover:underline font-semibold">
        ← Back to Profile
      </Link>
    </div>
  );
}
