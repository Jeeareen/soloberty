'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/hooks/useAuth';
import {
  Settings as SettingsIcon,
  User,
  Shield,
  Bell,
  MapPin,
  LogOut,
  ArrowLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/auth/login');
    } catch (err) {
      console.error('Failed to log out:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 sm:p-6 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header Navigation */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all shadow-sm text-slate-600 hover:text-slate-900"
              title="Back to Profile"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                <SettingsIcon className="w-6 h-6 text-blue-600" />
                Settings
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Manage your account preferences and security
              </p>
            </div>
          </div>
        </div>

        {/* User Account Details */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">
              Account Overview
            </h2>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
              Active Session
            </span>
          </div>

          <div className="flex items-center gap-4 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
              {user?.email?.[0]?.toUpperCase() || <User className="w-6 h-6" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-sm text-slate-900 truncate">
                {user?.email || 'Logged In User'}
              </div>
              <div className="text-xs text-slate-500 truncate font-mono">
                UID: {user?.uid || 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Preferences Section */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-3">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 mb-2">
            Preferences & Security
          </h2>

          <div className="divide-y divide-slate-100">
            <div className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-xl transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">Privacy & Visibility</div>
                  <div className="text-xs text-slate-500">Control who can view your card</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>

            <div className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-xl transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">Notifications</div>
                  <div className="text-xs text-slate-500">Manage chat & match alerts</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>

            <div className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-xl transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">Location Settings</div>
                  <div className="text-xs text-slate-500">Toggle exact vs approximate city</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Log Out Action */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-3">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">
            Session Management
          </h2>
          <button
            onClick={handleLogout}
            className="w-full py-3.5 px-4 bg-rose-600 hover:bg-rose-500 active:scale-[0.99] text-white font-bold text-sm rounded-2xl shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Log Out of Soloberty
          </button>
        </div>
      </div>
    </div>
  );
}
