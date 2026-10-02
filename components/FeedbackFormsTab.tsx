'use client';

import React, { useState, useMemo } from 'react';
import {
  ClipboardList,
  PlusCircle,
  Share2,
  Trash2,
  Power,
  ExternalLink,
  Plus,
  QrCode,
  Filter,
  UserCheck,
  CheckCircle2,
  Award,
  Layers,
  HelpCircle,
} from 'lucide-react';
import {
  FeedbackForm,
  FeedbackQuestion,
  BatchItem,
  ClassItem,
  TeacherItem,
  StudentItem,
  FeedbackResponse,
  QuestionType,
  QuestionOption,
} from '@/types';
import {
  saveFeedbackForm,
  toggleFeedbackFormStatus,
  deleteFeedbackForm,
} from '@/lib/storage';
import { toastSuccess, toastError, confirmAction } from '@/lib/notification';
import { QRCodeModal } from '@/components/QRCodeModal';

interface FeedbackFormsTabProps {
  forms: FeedbackForm[];
  batches: BatchItem[];
  classes: ClassItem[];
  teachers: TeacherItem[];
  students: StudentItem[];
  responses: FeedbackResponse[];
  onDataChanged: () => void;
  onOpenTestStudentView: (formId: string) => void;
  initialBatchIdToCreate?: string | null;
  onClearInitialBatchId?: () => void;
}

export const FeedbackFormsTab: React.FC<FeedbackFormsTabProps> = ({
  forms,
  batches,
  classes,
  teachers,
  students,
  responses,
  onDataChanged,
  onOpenTestStudentView,
  initialBatchIdToCreate,
  onClearInitialBatchId,
}) => {
  // Modal visibility
  const [showCreateModal, setShowCreateModal] = useState<boolean>(Boolean(initialBatchIdToCreate));

  // QR Code Modal State
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

  // Filters for viewing forms
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>('all');

  // Form creation fields
  const initialClassId = useMemo(() => {
    if (initialBatchIdToCreate) {
      const b = batches.find((x) => x.id === initialBatchIdToCreate);
      if (b) return b.classId;
    }
    return classes[0]?.id || '';
  }, [initialBatchIdToCreate, batches, classes]);

  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [selectedBatchId, setSelectedBatchId] = useState<string>(initialBatchIdToCreate || 'all');
  const [title, setTitle] = useState('Academic Term Feedback & Faculty Evaluation');
  const [description, setDescription] = useState('Evaluate course delivery, subject knowledge, and faculty support.');
  const [expiresAt, setExpiresAt] = useState('2026-12-31');

  // Custom questions (Default 2 Multiple Choice with 4 options and scores, plus 1 Text box)
  const [questions, setQuestions] = useState<FeedbackQuestion[]>([
    {
      id: 'q-1',
      text: 'Subject knowledge and clarity of explanation',
      type: 'multiple_choice',
      options: [
        { id: 'opt-1-1', text: 'Excellent', score: 10 },
        { id: 'opt-1-2', text: 'Good', score: 8 },
        { id: 'opt-1-3', text: 'Average', score: 5 },
        { id: 'opt-1-4', text: 'Poor', score: 2 },
      ],
      required: true,
      teacherId: '',
    },
    {
      id: 'q-2',
      text: 'Punctuality, syllabus coverage and doubt-solving support',
      type: 'multiple_choice',
      options: [
        { id: 'opt-2-1', text: 'Always on time & very helpful', score: 10 },
        { id: 'opt-2-2', text: 'Regular & clears doubts', score: 8 },
        { id: 'opt-2-3', text: 'Average support', score: 5 },
        { id: 'opt-2-4', text: 'Needs significant improvement', score: 2 },
      ],
      required: true,
      teacherId: '',
    },
    {
      id: 'q-3',
      text: 'Suggestions or specific comments for improvement (Optional)',
      type: 'text',
      required: false,
      teacherId: '',
    },
  ]);

  // Available batches for selected class
  const classBatches = useMemo(() => {
    if (!selectedClassId) return [];
    return batches.filter((b) => b.classId === selectedClassId);
  }, [selectedClassId, batches]);

  // Teachers assigned to the selected class / batch
  const eligibleTeachers = useMemo(() => {
    if (selectedBatchId && selectedBatchId !== 'all') {
      return teachers.filter((t) => t.assignedBatchIds.includes(selectedBatchId));
    }
    if (selectedClassId) {
      const batchIdsInClass = batches.filter((b) => b.classId === selectedClassId).map((b) => b.id);
      return teachers.filter(
        (t) =>
          t.assignedBatchIds.length === 0 ||
          t.assignedBatchIds.some((bid) => batchIdsInClass.includes(bid))
      );
    }
    return teachers;
  }, [selectedClassId, selectedBatchId, batches, teachers]);

  // Filtered forms list
  const filteredForms = useMemo(() => {
    return forms.filter((f) => {
      if (selectedClassFilter !== 'all' && f.classId && f.classId !== selectedClassFilter) {
        return false;
      }
      if (selectedBatchFilter !== 'all' && f.batchId !== selectedBatchFilter) {
        return false;
      }
      return true;
    });
  }, [forms, selectedClassFilter, selectedBatchFilter]);

  // Open modal
  const handleOpenCreateModal = (preselectedBatchId?: string) => {
    let targetClass = classes[0]?.id || '';
    let targetBatch = 'all';

    if (preselectedBatchId) {
      const b = batches.find((x) => x.id === preselectedBatchId);
      if (b) {
        targetClass = b.classId;
        targetBatch = b.id;
      }
    }

    setSelectedClassId(targetClass);
    setSelectedBatchId(targetBatch);
    setTitle('Academic Term Feedback & Faculty Evaluation');
    setDescription('Evaluate course delivery, subject knowledge, and faculty support.');
    setExpiresAt('2026-12-31');
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    if (onClearInitialBatchId) onClearInitialBatchId();
  };

  // Add question (ONLY multiple_choice or text allowed)
  const handleAddQuestion = (type: QuestionType) => {
    const newQ: FeedbackQuestion = {
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      text: '',
      type,
      options:
        type === 'multiple_choice'
          ? [
              { id: 'opt-1', text: 'Option A (Excellent)', score: 10 },
              { id: 'opt-2', text: 'Option B (Good)', score: 8 },
              { id: 'opt-3', text: 'Option C (Average)', score: 5 },
              { id: 'opt-4', text: 'Option D (Poor)', score: 2 },
            ]
          : undefined,
      required: true,
      teacherId: '',
    };
    setQuestions((prev) => [...prev, newQ]);
  };

  const handleUpdateQuestion = (id: string, updates: Partial<FeedbackQuestion>) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  const handleDeleteQuestion = (id: string) => {
    if (questions.length <= 1) {
      toastError('A feedback form must have at least one question');
      return;
    }
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  // Update specific option in multiple choice question
  const handleUpdateOption = (
    questionId: string,
    optionIndex: number,
    field: 'text' | 'score',
    value: string | number
  ) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === questionId && q.options) {
          const nextOptions = [...q.options];
          if (field === 'score') {
            nextOptions[optionIndex] = {
              ...nextOptions[optionIndex],
              score: Number(value) || 0,
            };
          } else {
            nextOptions[optionIndex] = {
              ...nextOptions[optionIndex],
              text: String(value),
            };
          }
          return { ...q, options: nextOptions };
        }
        return q;
      })
    );
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId) {
      toastError('Please select a target class');
      return;
    }
    if (!title.trim()) {
      toastError('Please provide a form title');
      return;
    }
    if (questions.length === 0) {
      toastError('Please add at least one question');
      return;
    }

    const emptyQ = questions.find((q) => !q.text.trim());
    if (emptyQ) {
      toastError('All questions must have question text filled');
      return;
    }

    // Validate 4 options for multiple choice questions
    for (const q of questions) {
      if (q.type === 'multiple_choice') {
        if (!q.options || q.options.length !== 4) {
          toastError(`Question "${q.text.slice(0, 30)}" must have exactly 4 options with scores`);
          return;
        }
        for (const opt of q.options) {
          if (!opt.text.trim()) {
            toastError('All 4 options must have text labels');
            return;
          }
        }
      }
    }

    const classObj = classes.find((c) => c.id === selectedClassId);
    const prefix = (classObj?.code || 'FB').replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase();
    const code = `${prefix}-${Math.floor(100 + Math.random() * 900)}`;

    const newForm: FeedbackForm = {
      id: `fb-form-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      classId: selectedClassId,
      batchId: selectedBatchId || 'all',
      questions,
      status: 'active',
      expiresAt: expiresAt || undefined,
      shareableCode: code,
      createdAt: new Date().toISOString(),
    };

    saveFeedbackForm(newForm);
    toastSuccess(`Feedback form created! (Share Code: ${newForm.shareableCode})`);
    handleCloseModal();
    onDataChanged();
  };

  const handleToggleStatus = (form: FeedbackForm) => {
    const nextStatus = toggleFeedbackFormStatus(form.id);
    if (nextStatus === 'active') {
      toastSuccess(`Form is now ACTIVE`);
    } else {
      toastSuccess(`Form is now CLOSED`);
    }
    onDataChanged();
  };

  const handleDeleteForm = async (form: FeedbackForm) => {
    const formResponses = responses.filter((r) => r.formId === form.id);
    const confirmed = await confirmAction({
      title: 'Delete Feedback Form?',
      text:
        formResponses.length > 0
          ? `This form has ${formResponses.length} recorded response(s). Deleting will remove these responses permanently.`
          : 'Are you sure you want to delete this feedback form?',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
      isDestructive: true,
    });

    if (confirmed) {
      deleteFeedbackForm(form.id);
      toastSuccess('Feedback form deleted');
      onDataChanged();
    }
  };

  const handleCopyLink = (form: FeedbackForm) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}?code=${form.shareableCode}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      toastSuccess(`Evaluation link copied (${form.shareableCode})`);
    } else {
      toastSuccess(`Share Code: ${form.shareableCode}`);
    }
  };

  const handleOpenQR = (form: FeedbackForm) => {
    const batch = batches.find((b) => b.id === form.batchId);
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}?code=${form.shareableCode}`;
    setQrModalData({
      isOpen: true,
      formTitle: form.title,
      shareableCode: form.shareableCode,
      batchName: batch?.name || 'Class Evaluation',
      shareUrl,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Feedback Forms</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Create evaluations with scored Multiple Choice (4 options) and Text box questions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {classes.length > 0 && (
            <div className="flex items-center space-x-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 font-medium"
              >
                <option value="all">All Classes ({forms.length})</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => handleOpenCreateModal()}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Feedback Form</span>
          </button>
        </div>
      </div>

      {/* Forms List */}
      {filteredForms.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-xs">
          <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No feedback forms found</p>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Create an evaluation form with Multiple Choice options (with marks) and Text box questions.
          </p>
          <button
            onClick={() => handleOpenCreateModal()}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold"
          >
            Create Feedback Form
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredForms.map((form) => {
            const classObj = classes.find((c) => c.id === form.classId);
            const batchObj = batches.find((b) => b.id === form.batchId);
            const formResponses = responses.filter((r) => r.formId === form.id);
            const isActive = form.status === 'active';
            const isExpired = form.expiresAt && new Date(form.expiresAt) < new Date();

            const mcqCount = form.questions.filter((q) => q.type === 'multiple_choice').length;
            const textCount = form.questions.filter((q) => q.type === 'text').length;
            const teacherSpecificCount = form.questions.filter((q) => Boolean(q.teacherId)).length;

            return (
              <div
                key={form.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                      <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        {classObj?.name || 'Class'}
                      </span>
                      <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {batchObj ? batchObj.name : 'All Batches / Direct'}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border shrink-0 ${
                        !isActive || isExpired
                          ? 'bg-slate-100 text-slate-600 border-slate-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {!isActive ? 'Closed' : isExpired ? 'Expired' : 'Active'}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm mt-2">{form.title}</h3>
                  {form.description && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{form.description}</p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-medium">
                      <Award className="w-3 h-3 text-blue-600" />
                      <span>{mcqCount} Scored Multiple Choice (4 Options)</span>
                    </span>

                    {textCount > 0 && (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                        <span>{textCount} Text Comments</span>
                      </span>
                    )}

                    {teacherSpecificCount > 0 && (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-medium">
                        <UserCheck className="w-3 h-3 text-amber-600" />
                        <span>{teacherSpecificCount} Assigned to Teacher</span>
                      </span>
                    )}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      Submissions: <strong className="text-slate-800">{formResponses.length}</strong>
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Valid: {form.expiresAt || 'No Expiry'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handleCopyLink(form)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
                      title="Copy Shareable Link"
                    >
                      <Share2 className="w-3 h-3 text-teal-600" />
                      <span>Copy</span>
                    </button>
                    <button
                      onClick={() => handleOpenQR(form)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
                      title="Generate QR Code"
                    >
                      <QrCode className="w-3 h-3 text-slate-600" />
                      <span>QR Code</span>
                    </button>
                    <button
                      onClick={() => onOpenTestStudentView(form.id)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-medium"
                    >
                      <span>Open Form</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleToggleStatus(form)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded"
                      title={isActive ? 'Close form' : 'Open form'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteForm(form)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded"
                      title="Delete form"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Clean Create Feedback Form Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col justify-between">
            <div className="overflow-y-auto pr-1 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Create Feedback Form</h3>
                  <p className="text-xs text-slate-500">
                    Two fields only: Multiple Choice (4 scored options) and Text box questions.
                  </p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Class & Batch Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Select Target Class *
                  </label>
                  <select
                    required
                    value={selectedClassId}
                    onChange={(e) => {
                      setSelectedClassId(e.target.value);
                      setSelectedBatchId('all');
                    }}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Target Batch (Optional)
                  </label>
                  <select
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    <option value="all">
                      {classBatches.length > 0
                        ? 'All Batches in this Class'
                        : 'Whole Class (No Batches Required)'}
                    </option>
                    {classBatches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {classBatches.length === 0
                      ? 'No batch is needed; students will evaluate at class level.'
                      : 'You can target all batches or pick a specific batch.'}
                  </p>
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Form Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mid-Term Faculty Evaluation"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Short Description
                    </label>
                    <input
                      type="text"
                      placeholder="Instructions for students"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* Question Builder: Only Two Fields Allowed: Multiple Choice & Text Box */}
              <div className="pt-2 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Questions ({questions.length})
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Choose Multiple Choice (with 4 scored options) or Text box
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleAddQuestion('multiple_choice')}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg border border-teal-200 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Multiple Choice (4 Options)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddQuestion('text')}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Text Box</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {questions.map((q, idx) => {
                    const isAssignedToTeacher = Boolean(q.teacherId);

                    return (
                      <div
                        key={q.id}
                        className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3"
                      >
                        {/* Question Title & Delete */}
                        <div className="flex items-start justify-between gap-2">
                          <span className="w-6 h-6 rounded bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>

                          <div className="flex-1 space-y-1">
                            <input
                              type="text"
                              required
                              placeholder="Question statement (e.g. Faculty subject knowledge & explanation)..."
                              value={q.text}
                              onChange={(e) => handleUpdateQuestion(q.id, { text: e.target.value })}
                              className="w-full px-3 py-2 text-xs sm:text-sm font-medium border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                            />
                            <div className="flex items-center space-x-2">
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                  q.type === 'multiple_choice'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {q.type === 'multiple_choice'
                                  ? 'Multiple Choice (4 Options)'
                                  : 'Text Box / Written Comment'}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="text-slate-400 hover:text-red-500 p-1"
                            title="Delete Question"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Multiple Choice: 4 Options with Individual Marks / Scores */}
                        {q.type === 'multiple_choice' && (
                          <div className="pl-8 space-y-2.5 pt-2 border-t border-slate-200/60">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-700">
                                4 Options & Corresponding Marks / Number (Scoring):
                              </span>
                              <span className="text-[10px] text-slate-500">
                                Max Marks:{' '}
                                <strong className="text-teal-700">
                                  {Math.max(...(q.options || []).map((o) => o.score || 0), 0)}
                                </strong>
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {(q.options || []).map((opt, optIdx) => (
                                <div
                                  key={opt.id || optIdx}
                                  className="flex items-center space-x-2 bg-white p-2 rounded-lg border border-slate-200"
                                >
                                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                                    {String.fromCharCode(65 + optIdx)}
                                  </span>

                                  <input
                                    type="text"
                                    required
                                    value={opt.text}
                                    onChange={(e) =>
                                      handleUpdateOption(q.id, optIdx, 'text', e.target.value)
                                    }
                                    placeholder={`Option ${optIdx + 1} text`}
                                    className="flex-1 px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-teal-500"
                                  />

                                  <div className="flex items-center space-x-1 shrink-0">
                                    <span className="text-[10px] text-slate-500 font-medium">Marks:</span>
                                    <input
                                      type="number"
                                      required
                                      value={opt.score}
                                      onChange={(e) =>
                                        handleUpdateOption(q.id, optIdx, 'score', e.target.value)
                                      }
                                      className="w-14 px-1.5 py-1 text-xs font-bold text-teal-800 bg-teal-50/50 border border-teal-300 rounded text-center focus:ring-1 focus:ring-teal-500"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Text Box Preview */}
                        {q.type === 'text' && (
                          <div className="pl-8 pt-1">
                            <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-400 text-xs italic">
                              Students will be provided an open text box for comments, feedback, and notes.
                            </div>
                          </div>
                        )}

                        {/* Question Options Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pl-8 pt-1 border-t border-slate-200/50">
                          {/* Assign Question to Teacher Checkbox & Dropdown */}
                          <div className="flex items-center space-x-2">
                            <label className="flex items-center space-x-1.5 text-[11px] font-medium text-slate-700 cursor-pointer bg-white px-2.5 py-1 rounded border border-slate-300">
                              <input
                                type="checkbox"
                                checked={isAssignedToTeacher}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    handleUpdateQuestion(q.id, {
                                      teacherId: eligibleTeachers[0]?.id || '',
                                    });
                                  } else {
                                    handleUpdateQuestion(q.id, { teacherId: '' });
                                  }
                                }}
                                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                              />
                              <span>Assign question to teacher</span>
                            </label>

                            {isAssignedToTeacher && (
                              <select
                                value={q.teacherId || ''}
                                onChange={(e) =>
                                  handleUpdateQuestion(q.id, { teacherId: e.target.value })
                                }
                                className="px-2 py-1 text-xs border border-amber-300 bg-amber-50 text-amber-900 font-semibold rounded-lg"
                              >
                                {eligibleTeachers.length === 0 ? (
                                  <option value="">No teachers available</option>
                                ) : (
                                  eligibleTeachers.map((t) => (
                                    <option key={t.id} value={t.id}>
                                      {t.name}
                                    </option>
                                  ))
                                )}
                              </select>
                            )}
                          </div>

                          <label className="inline-flex items-center space-x-1.5 text-[11px] text-slate-600 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={q.required}
                              onChange={(e) =>
                                handleUpdateQuestion(q.id, { required: e.target.checked })
                              }
                              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                            />
                            <span>Required Question</span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4">
              <span className="text-xs text-slate-400">
                {questions.length} questions • Dynamic scoring enabled
              </span>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveForm}
                  className="px-4 py-1.5 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-xs"
                >
                  Publish Feedback Form
                </button>
              </div>
            </div>
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
