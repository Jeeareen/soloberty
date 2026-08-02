import Link from 'next/link';

export default async function HealthPage() {
  const res = await fetch('https://jsonplaceholder.typicode.com/todos/1', {
    cache: 'no-store',
  });
  const data = await res.json();

  return (
    <div className="p-6 max-w-lg mx-auto bg-white rounded-2xl shadow mt-10 space-y-4 border border-gray-100">
      <h1 className="text-xl font-bold text-green-600">Status: OK</h1>
      <pre className="p-4 bg-gray-100 rounded text-sm overflow-x-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
      <div className="border-t border-gray-100 pt-4">
        <Link href="/profile" className="text-sm text-blue-600 hover:underline font-semibold">
          ← Back to Profile
        </Link>
      </div>
    </div>
  );
}
