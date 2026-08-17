import type { Metadata } from 'next';
import { Outfit, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import Navbar from '../components/Navbar';
import { AuthProvider } from '../lib/context/AuthContext';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['600', '700'],
  display: 'swap',
  variable: '--font-heading',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: 'Discovery App - Soloberty',
  description: 'Discovery and matching application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable} ${plusJakartaSans.variable} max-w-full overflow-x-hidden`}>
      <body className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans antialiased max-w-full w-full overflow-x-hidden">
        <AuthProvider>
          <Navbar />
          <main className="w-full max-w-full overflow-x-hidden">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
