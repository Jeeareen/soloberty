import type { Metadata } from 'next';
import './globals.css';
import Navbar from '../components/Navbar';

export const metadata: Metadata = {
  title: 'Discovery App - Solibero',
  description: 'Discovery and matching application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="max-w-full overflow-x-hidden">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased max-w-full w-full overflow-x-hidden">
        <Navbar />
        <main className="w-full max-w-full overflow-x-hidden">{children}</main>
      </body>
    </html>
  );
}
