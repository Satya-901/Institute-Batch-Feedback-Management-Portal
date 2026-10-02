'use client';

import React, { useState } from 'react';
import { Lock, ShieldAlert, ArrowLeft } from 'lucide-react';
import { checkAdminCredentials } from '@/lib/storage';
import { toastSuccess, toastError, alertWarning } from '@/lib/notification';
import Link from 'next/link';

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [accessDeniedCount, setAccessDeniedCount] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toastError('Please enter administrator credentials');
      return;
    }

    setLoading(true);
    const valid = await checkAdminCredentials(username.trim(), password.trim());
    setLoading(false);

    if (valid) {
      toastSuccess('Administrator authenticated successfully');
      onLoginSuccess();
    } else {
      setAccessDeniedCount((prev) => prev + 1);
      alertWarning(
        'Access Denied (Unauthorized)',
        'Invalid administrator credentials. Access to this management zone is strictly monitored and restricted.'
      );
      toastError('Unauthorized: Access Denied');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Guard Card */}
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Top Banner with Security Warning */}
          <div className="bg-slate-900 text-white p-6 text-center border-b border-slate-800">
            <div className="w-12 h-12 rounded-xl bg-red-950/80 border border-red-500/40 flex items-center justify-center mx-auto mb-3 text-red-400 shadow-md">
              <ShieldAlert className="w-6 h-6 text-red-400" />
            </div>

            <span className="inline-block text-[11px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-red-900/50 text-red-300 border border-red-700/60 mb-2">
              Protected Administrative Zone
            </span>

            <h1 className="text-xl font-bold tracking-tight">Administrator Authorization</h1>
            <p className="text-xs text-slate-400 mt-1">
              Unauthorized access is prohibited. Please authenticate to access the management portal.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {accessDeniedCount > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-semibold flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                <span>Unauthorized: Invalid username or password</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Administrator Username
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center space-x-2"
            >
              <Lock className="w-4 h-4 text-teal-400" />
              <span>{loading ? 'Verifying Authorization...' : 'Authenticate as Administrator'}</span>
            </button>
          </form>

          {/* Safe return to student portal */}
          <div className="bg-slate-50 p-4 border-t border-slate-200 text-center">
            <Link
              href="/"
              className="text-xs text-slate-600 hover:text-slate-900 font-medium inline-flex items-center space-x-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Student Feedback Portal</span>
            </Link>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-500 mt-4">
          EduPulse Academic Evaluation System • All Access Attempts Audited
        </p>
      </div>
    </div>
  );
};
