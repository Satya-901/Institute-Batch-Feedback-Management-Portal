'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { X, ArrowLeft } from 'lucide-react';
import {
  ActiveTab,
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
  isAdminLoggedIn,
  setAdminLoggedIn,
} from '@/lib/storage';

const emptySubscribe = () => () => {};

export default function HomePage() {
  const isClient = React.useSyncExternalStore(emptySubscribe, () => true, () => false);

  // Check if admin portal is explicitly requested via ?admin=true or ?portal=admin
  const [isAdminPortalRequested, setIsAdminPortalRequested] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.has('admin') || params.get('portal') === 'admin';
    }
    return false;
  });

  // Admin session authentication state
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return isAdminLoggedIn();
    }
    return false;
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  // Application Data States (Zero dummy data, loaded from SQLite)
  const [classes, setClasses] = useState<ClassItem[]>(() => getClasses());
  const [batches, setBatches] = useState<BatchItem[]>(() => getBatches());
  const [teachers, setTeachers] = useState<TeacherItem[]>(() => getTeachers());
  const [students, setStudents] = useState<StudentItem[]>(() => getStudents());
  const [forms, setForms] = useState<FeedbackForm[]>(() => getFeedbackForms());
  const [responses, setResponses] = useState<FeedbackResponse[]>(() => getResponses());

  // Student specific states
  const [currentStudent, setCurrentStudent] = useState<StudentItem | null>(null);
  const [targetFormIdForStudent, setTargetFormIdForStudent] = useState<string | null>(null);

  // Read shareable link code if provided (e.g. ?code=CHE-101)
  const [shareCode] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('code');
    }
    return null;
  });

  // Preview form inside admin mode
  const [adminPreviewFormId, setAdminPreviewFormId] = useState<string | null>(null);

  // Quick action batch preselection for feedback creation
  const [initialBatchIdForForm, setInitialBatchIdForForm] = useState<string | null>(null);

  // Synchronize from SQLite backend
  const refreshData = useCallback(async () => {
    const data = await syncFromSqlite();
    setClasses(data.classes);
    setBatches(data.batches);
    setTeachers(data.teachers);
    setStudents(data.students);
    setForms(data.forms);
    setResponses(data.responses);
  }, []);

  // Initial sync from SQLite on mount
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
    return () => {
      ignore = true;
    };
  }, []);

  // Compute matched target form id if shared via ?code=
  const effectiveTargetFormId = useMemo(() => {
    if (targetFormIdForStudent) return targetFormIdForStudent;
    if (shareCode && forms.length > 0) {
      return forms.find((f) => f.shareableCode.toUpperCase() === shareCode.toUpperCase())?.id || null;
    }
    return null;
  }, [targetFormIdForStudent, shareCode, forms]);

  // Logout handler
  const handleLogout = () => {
    setAdminLoggedIn(false);
    setIsAdmin(false);
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
    setCurrentStudent(student);
    setAdminPreviewFormId(forms.find((f) => f.batchId === student.batchId)?.id || forms[0]?.id || null);
  };

  if (!isClient) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-sm">
        Loading SQLite Database...
      </div>
    );
  }

  // ==========================================
  // CASE 1: ADMIN ACCESS REQUESTED (?admin=true or /admin)
  // ==========================================
  if (isAdminPortalRequested) {
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
            <span>Admin Live Preview Mode (Form ID: {adminPreviewFormId})</span>
            <button
              onClick={() => setAdminPreviewFormId(null)}
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
              currentStudent={currentStudent}
              setCurrentStudent={setCurrentStudent}
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
  }

  // ==========================================
  // CASE 2: DEFAULT PUBLIC VIEW -> ONLY STUDENT PORTAL
  // Absolutely no Admin Login links or buttons visible!
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased">
      <Navbar
        isAdmin={false}
        studentMode={true}
        onLogout={() => {}}
      />
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
          targetFormId={effectiveTargetFormId}
          onDataChanged={refreshData}
        />
      </main>
    </div>
  );
}
