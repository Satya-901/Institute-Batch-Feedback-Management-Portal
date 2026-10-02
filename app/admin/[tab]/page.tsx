'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { ActiveTab } from '@/types';

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

const VALID_TABS: Record<string, ActiveTab> = {
  overview: 'overview',
  classes: 'classes',
  batches: 'classes',
  teachers: 'teachers',
  faculty: 'teachers',
  students: 'students',
  feedback: 'feedback',
  forms: 'feedback',
  reports: 'reports',
};

export default function AdminTabPage() {
  const params = useParams();
  const rawTab = Array.isArray(params?.tab) ? params.tab[0] : (params?.tab as string);
  const activeTab: ActiveTab = (rawTab && VALID_TABS[rawTab.toLowerCase()]) || 'overview';

  return <AdminDashboard initialTab={activeTab} />;
}
