'use client';

import React, { useState } from 'react';
import {
  Layers,
  Users2,
  GraduationCap,
  ClipboardList,
  CheckCircle2,
  Share2,
  ExternalLink,
  Plus,
  UserPlus,
  ArrowRight,
  Database,
  QrCode,
} from 'lucide-react';
import {
  ClassItem,
  BatchItem,
  TeacherItem,
  StudentItem,
  FeedbackForm,
  FeedbackResponse,
  ActiveTab,
} from '@/types';
import { toastSuccess } from '@/lib/notification';
import { QRCodeModal } from '@/components/QRCodeModal';

interface OverviewTabProps {
  classes: ClassItem[];
  batches: BatchItem[];
  teachers: TeacherItem[];
  students: StudentItem[];
  forms: FeedbackForm[];
  responses: FeedbackResponse[];
  setActiveTab: (tab: ActiveTab) => void;
  onOpenCreateForm: () => void;
  onOpenBulkStudents: () => void;
  onTestStudentForm: (formId: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  classes,
  batches,
  teachers,
  students,
  forms,
  responses,
  setActiveTab,
  onOpenCreateForm,
  onOpenBulkStudents,
  onTestStudentForm,
}) => {
  const activeForms = forms.filter((f) => f.status === 'active');
  const isEmpty = classes.length === 0 && students.length === 0 && forms.length === 0;

  const [qrModalData, setQrModalData] = useState<{
    isOpen: boolean;
    formTitle: string;
    shareableCode: string;
    batchName?: string;
    shareUrl: string;
  }>({
    isOpen: false,
    formTitle: '',
    shareableCode: '',
    shareUrl: '',
  });

  const copyFormLink = (form: FeedbackForm) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}?code=${form.shareableCode}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      toastSuccess(`Link copied (${form.shareableCode})`);
    } else {
      toastSuccess(`Code: ${form.shareableCode}`);
    }
  };

  const openQrCode = (form: FeedbackForm) => {
    const batch = batches.find((b) => b.id === form.batchId);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}?code=${form.shareableCode}`;
    setQrModalData({
      isOpen: true,
      formTitle: form.title,
      shareableCode: form.shareableCode,
      batchName: batch?.name,
      shareUrl,
    });
  };

  return (
    <div className="space-y-6">
      {/* Clean Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Admin Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage academic batches, student enrolments, and evaluation feedback.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenBulkStudents}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5 text-amber-400" />
            <span>Enrol Students</span>
          </button>
          <button
            onClick={onOpenCreateForm}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Feedback Form</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div
          onClick={() => setActiveTab('classes')}
          className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition-all cursor-pointer shadow-xs"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wide">Classes</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{classes.length}</div>
        </div>

        <div
          onClick={() => setActiveTab('classes')}
          className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition-all cursor-pointer shadow-xs"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wide">Batches</span>
            <Layers className="w-4 h-4 text-teal-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-teal-700">{batches.length}</div>
        </div>

        <div
          onClick={() => setActiveTab('teachers')}
          className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition-all cursor-pointer shadow-xs"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wide">Faculty</span>
            <Users2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{teachers.length}</div>
        </div>

        <div
          onClick={() => setActiveTab('students')}
          className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition-all cursor-pointer shadow-xs"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wide">Students</span>
            <GraduationCap className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{students.length}</div>
        </div>

        <div
          onClick={() => setActiveTab('feedback')}
          className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition-all cursor-pointer shadow-xs col-span-2 lg:col-span-1"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium uppercase tracking-wide">Responses</span>
            <ClipboardList className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700">{responses.length}</div>
        </div>
      </div>

      {/* Empty State when no data is in SQLite yet */}
      {isEmpty && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-xs">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-600">
            <Database className="w-6 h-6 text-teal-600" />
          </div>
          <h2 className="text-base font-bold text-slate-800">Your Database is Ready</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-5">
            All data is saved in local <code>.sqlite</code> file. Get started by setting up your first class and batch.
          </p>
          <div className="flex flex-wrap justify-center gap-2.5">
            <button
              onClick={() => setActiveTab('classes')}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              1. Add Class & Batch
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              2. Add Students
            </button>
            <button
              onClick={() => setActiveTab('feedback')}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs"
            >
              3. Create Feedback Form
            </button>
          </div>
        </div>
      )}

      {/* Active Forms */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">Active Feedback Forms</h2>
          <button
            onClick={() => setActiveTab('feedback')}
            className="text-xs font-semibold text-teal-700 hover:underline flex items-center space-x-1"
          >
            <span>Manage All ({forms.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {activeForms.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No active feedback forms. Click &ldquo;New Feedback Form&rdquo; to publish one.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {activeForms.map((form) => {
              const cls = classes.find((c) => c.id === form.classId);
              const batch = batches.find((b) => b.id === form.batchId);
              const formResponses = responses.filter((r) => r.formId === form.id);

              return (
                <div
                  key={form.id}
                  className="rounded-lg border border-slate-200 p-4 bg-slate-50/50 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        {cls?.name || 'Class'} {batch ? `• ${batch.name}` : '• Direct'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {formResponses.length} submissions
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 mt-2">{form.title}</h3>
                    {form.description && (
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{form.description}</p>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => copyFormLink(form)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium border border-slate-300"
                        title="Copy Link"
                      >
                        <Share2 className="w-3 h-3 text-teal-600" />
                        <span>Copy</span>
                      </button>
                      <button
                        onClick={() => openQrCode(form)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium border border-slate-300"
                        title="Generate QR Code"
                      >
                        <QrCode className="w-3 h-3 text-slate-600" />
                        <span>QR</span>
                      </button>
                    </div>

                    <button
                      onClick={() => onTestStudentForm(form.id)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium"
                    >
                      <span>Open Form</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Submissions */}
      {responses.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Recent Submissions</h2>
            <button
              onClick={() => setActiveTab('reports')}
              className="text-xs font-semibold text-teal-700 hover:underline flex items-center space-x-1"
            >
              <span>View Analytics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-2 divide-y divide-slate-100">
            {responses.slice(0, 5).map((resp) => {
              const form = forms.find((f) => f.id === resp.formId);
              return (
                <div key={resp.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800">{resp.studentName}</span>
                    <span className="font-mono text-slate-400 ml-2">({resp.studentId})</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {form?.title || 'Evaluation Form'}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(resp.submittedAt).toLocaleDateString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={qrModalData.isOpen}
        onClose={() => setQrModalData((prev) => ({ ...prev, isOpen: false }))}
        formTitle={qrModalData.formTitle}
        shareableCode={qrModalData.shareableCode}
        batchName={qrModalData.batchName}
        shareUrl={qrModalData.shareUrl}
      />
    </div>
  );
};
