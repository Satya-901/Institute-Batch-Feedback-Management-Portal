'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Navbar } from '@/components/Navbar';
import { StudentPortal } from '@/components/StudentPortal';

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
import {
  ClassItem,
  BatchItem,
  TeacherItem,
  StudentItem,
  FeedbackForm,
  FeedbackResponse,
} from '@/types';
import {
  getClasses,
  getBatches,
  getTeachers,
  getStudents,
  getFeedbackForms,
  getResponses,
  syncFromSqlite,
} from '@/lib/storage';

const emptySubscribe = () => () => {};

export default function HomePage() {
  const isClient = React.useSyncExternalStore(emptySubscribe, () => true, () => false);

  // Check URL query parameters: ?admin=true or ?admin=login or ?portal=admin
  const [isAdminUrl, setIsAdminUrl] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.has('admin') || params.get('portal') === 'admin';
    }
    return false;
  });

  // Watch for changes in browser URL
  useEffect(() => {
    const handleUrlCheck = () => {
      const params = new URLSearchParams(window.location.search);
      setIsAdminUrl(params.has('admin') || params.get('portal') === 'admin');
    };
    window.addEventListener('popstate', handleUrlCheck);
    return () => window.removeEventListener('popstate', handleUrlCheck);
  }, []);

  // Data states for Student Portal
  const [classes, setClasses] = useState<ClassItem[]>(() => getClasses());
  const [batches, setBatches] = useState<BatchItem[]>(() => getBatches());
  const [teachers, setTeachers] = useState<TeacherItem[]>(() => getTeachers());
  const [students, setStudents] = useState<StudentItem[]>(() => getStudents());
  const [forms, setForms] = useState<FeedbackForm[]>(() => getFeedbackForms());
  const [responses, setResponses] = useState<FeedbackResponse[]>(() => getResponses());

  // Student active session state
  const [currentStudent, setCurrentStudent] = useState<StudentItem | null>(null);

  // Read share code if provided in URL (e.g. ?code=CHE-101)
  const [shareCode] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('code');
    }
    return null;
  });

  // Synchronize data from Server File
  const refreshData = useCallback(async () => {
    const data = await syncFromSqlite();
    setClasses(data.classes);
    setBatches(data.batches);
    setTeachers(data.teachers);
    setStudents(data.students);
    setForms(data.forms);
    setResponses(data.responses);
  }, []);

  useEffect(() => {
    let ignore = false;
    syncFromSqlite().then((data) => {
      if (!ignore) {
        setClasses(data.classes);
        setBatches(data.batches);
        setTeachers(data.teachers);
        setStudents(data.students);
        setForms(data.forms);
        setResponses(data.responses);
      }
    });

    // Auto-refresh when tab gains focus or on interval so other device updates appear immediately
    const handleFocus = () => {
      refreshData();
    };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') refreshData();
    });

    const interval = setInterval(() => {
      if (!ignore && document.visibilityState === 'visible') {
        refreshData();
      }
    }, 12000);

    return () => {
      ignore = true;
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [refreshData]);

  // Target form matching shareable link code
  const targetFormId = useMemo(() => {
    if (shareCode && forms.length > 0) {
      return forms.find((f) => f.shareableCode.toUpperCase() === shareCode.toUpperCase())?.id || null;
    }
    return null;
  }, [shareCode, forms]);

  if (!isClient) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-sm">
        Loading Institutional Portal...
      </div>
    );
  }

  // If ?admin=true is in the URL, render the Admin Portal
  if (isAdminUrl) {
    return <AdminDashboard />;
  }

  // DEFAULT VIEW: Pure Student Portal (NO admin links anywhere)
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased">
      <Navbar isAdmin={false} studentMode={true} onLogout={() => {}} />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
        <StudentPortal
          students={students}
          forms={forms}
          responses={responses}
          batches={batches}
          classes={classes}
          teachers={teachers}
          currentStudent={currentStudent}
          setCurrentStudent={setCurrentStudent}
          targetFormId={targetFormId}
          onDataChanged={refreshData}
        />
      </main>
    </div>
  );
}
