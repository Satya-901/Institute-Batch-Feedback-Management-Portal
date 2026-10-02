'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const AdminDashboard = dynamic(
  () => import('@/components/AdminDashboard').then((mod) => mod.AdminDashboard),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-medium text-slate-400">Loading Dashboard...</p>
      </div>
    ),
  }
);

export default function AdminPage() {
  return <AdminDashboard />;
}

