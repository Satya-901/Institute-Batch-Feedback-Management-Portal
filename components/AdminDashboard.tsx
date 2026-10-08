'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { OverviewTab } from '@/components/OverviewTab';
import { ClassesBatchesTab } from '@/components/ClassesBatchesTab';
import { TeachersTab } from '@/components/TeachersTab';
import { StudentsTab } from '@/components/StudentsTab';
import { FeedbackFormsTab } from '@/components/FeedbackFormsTab';
import { ReportsTab } from '@/components/ReportsTab';
import { StudentPortal } from '@/components/StudentPortal';
import { AdminLogin } from '@/components/AdminLogin';
import { ArrowLeft } from 'lucide-react';
import {
  ActiveTab,
  ClassItem,
  BatchItem,
  TeacherItem,
  StudentItem,
  FeedbackForm,
  FeedbackResponse,
  FormTemplate,
} from '@/types';
import {
  getClasses,
  getBatches,
  getTeachers,
  getStudents,
  getFeedbackForms,
  getResponses,
  getFormTemplates,
  syncFromSqlite,
  isAdminLoggedIn,
  setAdminLoggedIn,
} from '@/lib/storage';

interface AdminDashboardProps {
  initialTab?: ActiveTab;
}

const VALID_TABS_MAP: Record<string, ActiveTab> = {
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

const resolveTab = (initial?: ActiveTab): ActiveTab => {
  if (initial && VALID_TABS_MAP[initial]) {
    return VALID_TABS_MAP[initial];
  }
  if (typeof window !== 'undefined') {
    const path = window.location.pathname;
    const match = path.match(/^\/admin\/([a-zA-Z0-9_-]+)/);
    if (match && match[1] && VALID_TABS_MAP[match[1].toLowerCase()]) {
      return VALID_TABS_MAP[match[1].toLowerCase()];
    }
    const param = new URLSearchParams(window.location.search).get('tab');
    if (param && VALID_TABS_MAP[param.toLowerCase()]) {
      return VALID_TABS_MAP[param.toLowerCase()];
    }
    const saved = localStorage.getItem('edupulse_admin_active_tab');
    if (saved && VALID_TABS_MAP[saved.toLowerCase()]) {
      return VALID_TABS_MAP[saved.toLowerCase()];
    }
  }
  return 'overview';
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ initialTab }) => {
  const [mounted, setMounted] = useState<boolean>(false);

  // Admin authentication state
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return isAdminLoggedIn();
    }
    return false;
  });

  // Active Tab state persisted via clean URL paths (/admin/feedback) and localStorage
  const [activeTab, setActiveTabState] = useState<ActiveTab>(() => resolveTab(initialTab));

  const setActiveTab = useCallback((tab: ActiveTab) => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      localStorage.setItem('edupulse_admin_active_tab', tab);
      const targetUrl = tab === 'overview' ? '/admin' : `/admin/${tab}`;
      if (window.location.pathname !== targetUrl) {
        window.history.pushState(null, '', targetUrl);
      }
    }
  }, []);

  // Sync prop changes if route changes externally
  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTabState(initialTab);
    }
  }, [initialTab]);

  // Support browser Back/Forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const current = resolveTab();
      setActiveTabState(current);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Application Data States (Zero dummy data, loaded from SQLite)
  const [classes, setClasses] = useState<ClassItem[]>(() => getClasses());
  const [batches, setBatches] = useState<BatchItem[]>(() => getBatches());
  const [teachers, setTeachers] = useState<TeacherItem[]>(() => getTeachers());
  const [students, setStudents] = useState<StudentItem[]>(() => getStudents());
  const [forms, setForms] = useState<FeedbackForm[]>(() => getFeedbackForms());
  const [responses, setResponses] = useState<FeedbackResponse[]>(() => getResponses());
  const [templates, setTemplates] = useState<FormTemplate[]>(() => getFormTemplates());

  // Preview form inside admin mode
  const [adminPreviewFormId, setAdminPreviewFormId] = useState<string | null>(null);
  const [currentStudentForPreview, setCurrentStudentForPreview] = useState<StudentItem | null>(null);

  // Quick action batch preselection for feedback creation
  const [initialBatchIdForForm, setInitialBatchIdForForm] = useState<string | null>(null);

  // Synchronize from Server File backend
  const refreshData = useCallback(async () => {
    const data = await syncFromSqlite();
    setClasses(data.classes);
    setBatches(data.batches);
    setTeachers(data.teachers);
    setStudents(data.students);
    setForms(data.forms);
    setResponses(data.responses);
    setTemplates(data.templates || []);
  }, []);

  // Initial sync from Server on mount & auto-sync across devices
  useEffect(() => {
    setMounted(true);
    const loggedIn = isAdminLoggedIn();
    setIsAdmin(loggedIn);

    const currentTab = resolveTab(initialTab);
    setActiveTabState(currentTab);
    if (typeof window !== 'undefined' && loggedIn) {
      const targetUrl = currentTab === 'overview' ? '/admin' : `/admin/${currentTab}`;
      // Clean up legacy ?tab= query parameter if present
      if (window.location.search.includes('tab=')) {
        window.history.replaceState(null, '', targetUrl);
      }
    }

    let ignore = false;
    syncFromSqlite().then((data) => {
      if (!ignore) {
        setClasses(data.classes);
        setBatches(data.batches);
        setTeachers(data.teachers);
        setStudents(data.students);
        setForms(data.forms);
        setResponses(data.responses);
        setTemplates(data.templates || []);
      }
    });

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
    }, 10000);

    return () => {
      ignore = true;
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [refreshData, initialTab]);

  // Logout handler
  const handleLogout = () => {
    setAdminLoggedIn(false);
    setIsAdmin(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('edupulse_admin_active_tab');
      window.history.replaceState(null, '', '/admin');
    }
  };

  // Quick Action Handler from Sidebar / Overview
  const handleQuickAction = (
    action: 'add_class' | 'add_batch' | 'add_teacher' | 'bulk_students' | 'create_form'
  ) => {
    if (action === 'bulk_students') {
      setActiveTab('students');
    } else if (action === 'create_form') {
      setActiveTab('feedback');
    } else if (action === 'add_batch' || action === 'add_class') {
      setActiveTab('classes');
    } else if (action === 'add_teacher') {
      setActiveTab('teachers');
    }
  };

  const handleOpenCreateFormForBatch = (batchId: string) => {
    setInitialBatchIdForForm(batchId);
    setActiveTab('feedback');
  };

  const handleTestStudentForm = (formId: string) => {
    setAdminPreviewFormId(formId);
  };

  const handleLoginAsStudent = (student: StudentItem) => {
    setCurrentStudentForPreview(student);
    setAdminPreviewFormId(forms.find((f) => f.batchId === student.batchId)?.id || forms[0]?.id || null);
  };

  // Prevent flash of login screen before client mount has determined auth
  if (!mounted && !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-medium text-slate-400">Loading Dashboard...</p>
      </div>
    );
  }

  // If Admin is NOT logged in, show Admin Login (NO visible credentials on screen)
  if (!isAdmin) {
    return (
      <AdminLogin
        onLoginSuccess={() => {
          setIsAdmin(true);
          refreshData();
        }}
      />
    );
  }

  // If Admin clicked "Test / Preview Student Form" from dashboard
  if (adminPreviewFormId) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased">
        {/* Admin Preview Header */}
        <div className="bg-amber-500 text-amber-950 px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-xs">
          <span>Admin Live Evaluation Preview Mode (Form ID: {adminPreviewFormId})</span>
          <button
            onClick={() => {
              setAdminPreviewFormId(null);
              setCurrentStudentForPreview(null);
            }}
            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Admin Dashboard</span>
          </button>
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
          <StudentPortal
            students={students}
            forms={forms}
            responses={responses}
            batches={batches}
            classes={classes}
            teachers={teachers}
            currentStudent={currentStudentForPreview}
            setCurrentStudent={setCurrentStudentForPreview}
            targetFormId={adminPreviewFormId}
            onDataChanged={refreshData}
          />
        </main>
      </div>
    );
  }

  // Admin Dashboard (Authenticated)
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased">
      {/* Top Navigation */}
      <Navbar
        isAdmin={true}
        onLogout={handleLogout}
        onRefreshData={refreshData}
      />

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          classesCount={classes.length}
          batchesCount={batches.length}
          teachersCount={teachers.length}
          studentsCount={students.length}
          formsCount={forms.length}
          responsesCount={responses.length}
          onQuickAction={handleQuickAction}
        />

        {/* Content View Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 md:pb-8 bg-grid-pattern">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'overview' && (
              <OverviewTab
                classes={classes}
                batches={batches}
                teachers={teachers}
                students={students}
                forms={forms}
                responses={responses}
                setActiveTab={setActiveTab}
                onOpenCreateForm={() => setActiveTab('feedback')}
                onOpenBulkStudents={() => setActiveTab('students')}
                onTestStudentForm={handleTestStudentForm}
              />
            )}

            {activeTab === 'classes' && (
              <ClassesBatchesTab
                classes={classes}
                batches={batches}
                teachers={teachers}
                students={students}
                onDataChanged={refreshData}
                onOpenCreateFormForBatch={handleOpenCreateFormForBatch}
              />
            )}

            {activeTab === 'teachers' && (
              <TeachersTab
                teachers={teachers}
                batches={batches}
                classes={classes}
                forms={forms}
                responses={responses}
                onDataChanged={refreshData}
              />
            )}

            {activeTab === 'students' && (
              <StudentsTab
                students={students}
                batches={batches}
                classes={classes}
                onDataChanged={refreshData}
                onLoginAsStudent={handleLoginAsStudent}
              />
            )}

            {activeTab === 'feedback' && (
              <FeedbackFormsTab
                forms={forms}
                batches={batches}
                classes={classes}
                teachers={teachers}
                students={students}
                responses={responses}
                templates={templates}
                onDataChanged={refreshData}
                onOpenTestStudentView={handleTestStudentForm}
                initialBatchIdToCreate={initialBatchIdForForm}
                onClearInitialBatchId={() => setInitialBatchIdForForm(null)}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsTab
                forms={forms}
                batches={batches}
                classes={classes}
                teachers={teachers}
                students={students}
                responses={responses}
              />
            )}
          </div>
        </main>
      </div>

      {/* Mobile Navigation */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        formsCount={forms.length}
      />
    </div>
  );
};
