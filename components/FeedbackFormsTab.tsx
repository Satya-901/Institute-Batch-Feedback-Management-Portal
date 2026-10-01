'use client';

import React, { useState, useMemo } from 'react';
import {
  ClipboardList,
  PlusCircle,
  Share2,
  Trash2,
  Power,
  ExternalLink,
  Users2,
  Plus,
  QrCode,
  Filter,
  UserCheck,
  X,
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
  const [isPreselectedBatch, setIsPreselectedBatch] = useState<boolean>(Boolean(initialBatchIdToCreate));

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

  // Batch filter for viewing forms
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>('all');

  // Form creation fields
  const [selectedBatchId, setSelectedBatchId] = useState<string>(
    initialBatchIdToCreate || batches[0]?.id || ''
  );
  const [title, setTitle] = useState('Academic Term Feedback & Faculty Evaluation');
  const [description, setDescription] = useState('Evaluate course delivery, practical doubts, and faculty support.');
  const [expiresAt, setExpiresAt] = useState('2026-12-31');

  // Custom questions
  const [questions, setQuestions] = useState<FeedbackQuestion[]>([
    {
      id: 'q-1',
      text: 'Clarity of theoretical explanations and subject knowledge',
      type: 'rating',
      scaleMax: 5,
      scaleLabels: { min: 'Needs Improvement', max: 'Excellent' },
      required: true,
      teacherId: '',
    },
    {
      id: 'q-2',
      text: 'Teacher engagement, problem-solving support, and approachability',
      type: 'rating',
      scaleMax: 5,
      scaleLabels: { min: 'Poor', max: 'Outstanding' },
      required: true,
      teacherId: '',
    },
    {
      id: 'q-3',
      text: 'Suggestions or areas where you need additional academic support',
      type: 'text',
      required: false,
      teacherId: '',
    },
  ]);

  // Teachers assigned to the selected batch (kept in background/state)
  const batchTeachers = useMemo(() => {
    if (!selectedBatchId) return [];
    return teachers.filter((t) => t.assignedBatchIds.includes(selectedBatchId));
  }, [selectedBatchId, teachers]);

  // Filtered forms list
  const filteredForms = useMemo(() => {
    if (selectedBatchFilter === 'all') return forms;
    return forms.filter((f) => f.batchId === selectedBatchFilter);
  }, [forms, selectedBatchFilter]);

  // Open modal from common button or batch action
  const handleOpenCreateModal = (preselectedBatchId?: string) => {
    const targetBatch = preselectedBatchId || batches[0]?.id || '';
    setSelectedBatchId(targetBatch);
    setIsPreselectedBatch(Boolean(preselectedBatchId));
    setTitle('Academic Term Feedback & Faculty Evaluation');
    setDescription('Evaluate course delivery, practical doubts, and faculty support.');
    setExpiresAt('2026-12-31');
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setIsPreselectedBatch(false);
    if (onClearInitialBatchId) onClearInitialBatchId();
  };

  // Add question
  const handleAddQuestion = (type: QuestionType = 'rating') => {
    const newQ: FeedbackQuestion = {
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      text: '',
      type,
      scaleMax: 5,
      scaleLabels: { min: 'Needs Improvement', max: 'Excellent' },
      options: type === 'multiple_choice' ? ['Option A', 'Option B', 'Option C'] : undefined,
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

  // Multiple Choice Options handlers
  const handleAddOption = (questionId: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === questionId) {
          const currentOptions = q.options || [];
          return {
            ...q,
            options: [...currentOptions, `Option ${String.fromCharCode(65 + currentOptions.length)}`],
          };
        }
        return q;
      })
    );
  };

  const handleUpdateOption = (questionId: string, optionIndex: number, newValue: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === questionId && q.options) {
          const nextOptions = [...q.options];
          nextOptions[optionIndex] = newValue;
          return { ...q, options: nextOptions };
        }
        return q;
      })
    );
  };

  const handleDeleteOption = (questionId: string, optionIndex: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id === questionId && q.options) {
          if (q.options.length <= 2) {
            toastError('Multiple choice questions require at least 2 options');
            return q;
          }
          const nextOptions = q.options.filter((_, i) => i !== optionIndex);
          return { ...q, options: nextOptions };
        }
        return q;
      })
    );
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchId) {
      toastError('Please select a target batch');
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

    const batchObj = batches.find((b) => b.id === selectedBatchId);
    const prefix = (batchObj?.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3) || 'FB').toUpperCase();
    const code = `${prefix}-${Math.floor(100 + Math.random() * 900)}`;

    const newForm: FeedbackForm = {
      id: `fb-form-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      batchId: selectedBatchId,
      questions,
      status: 'active',
      expiresAt: expiresAt || undefined,
      shareableCode: code,
      createdAt: new Date().toISOString(),
    };

    saveFeedbackForm(newForm);
    toastSuccess(`Feedback form created! (Code: ${newForm.shareableCode})`);
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
      text: formResponses.length > 0
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
      toastSuccess(`Link copied (${form.shareableCode})`);
    } else {
      toastSuccess(`Code: ${form.shareableCode}`);
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
      batchName: batch?.name,
      shareUrl,
    });
  };

  const currentBatchObj = batches.find((b) => b.id === selectedBatchId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Feedback Forms</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Create multiple evaluations per batch with assigned questions and QR codes.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {batches.length > 1 && (
            <div className="flex items-center space-x-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedBatchFilter}
                onChange={(e) => setSelectedBatchFilter(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 font-medium"
              >
                <option value="all">All Batches ({forms.length})</option>
                {batches.map((b) => {
                  const bCount = forms.filter((f) => f.batchId === b.id).length;
                  return (
                    <option key={b.id} value={b.id}>
                      {b.name} ({bCount})
                    </option>
                  );
                })}
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
            You can create multiple feedback forms for any batch whenever required.
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
            const batch = batches.find((b) => b.id === form.batchId);
            const formResponses = responses.filter((r) => r.formId === form.id);
            const batchStudents = students.filter((s) => s.batchId === form.batchId);
            const isActive = form.status === 'active';
            const isExpired = form.expiresAt && new Date(form.expiresAt) < new Date();

            // Count teacher specific questions
            const teacherSpecificCount = form.questions.filter((q) => Boolean(q.teacherId)).length;

            return (
              <div
                key={form.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      {batch?.name || 'Batch'}
                    </span>
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
                    {teacherSpecificCount > 0 ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-medium">
                        <UserCheck className="w-3 h-3 text-amber-600" />
                        <span>{teacherSpecificCount} Teacher-Specific Questions</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px]">
                        <span>General Course Review</span>
                      </span>
                    )}

                    <span className="text-[11px] text-slate-400 font-mono self-center">
                      {form.questions.length} questions
                    </span>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Submissions: <strong className="text-slate-800">{formResponses.length}</strong> / {batchStudents.length}</span>
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
                      <span>Open</span>
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
                  <h3 className="font-bold text-slate-900 text-base">
                    Create Feedback Form
                  </h3>
                  <p className="text-xs text-slate-500">
                    Build evaluation forms with common and teacher-specific questions.
                  </p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Target Batch Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Batch *
                </label>
                {isPreselectedBatch ? (
                  <div className="flex items-center justify-between p-2.5 bg-teal-50 border border-teal-200 rounded-lg text-xs">
                    <span className="font-bold text-teal-900">
                      {currentBatchObj?.name || 'Selected Batch'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsPreselectedBatch(false)}
                      className="text-[11px] text-teal-700 hover:underline font-medium"
                    >
                      Change Batch
                    </button>
                  </div>
                ) : (
                  <select
                    required
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white"
                  >
                    {batches.map((b) => {
                      const c = classes.find((cl) => cl.id === b.classId);
                      return (
                        <option key={b.id} value={b.id}>
                          {b.name} ({c?.code || 'Class'})
                        </option>
                      );
                    })}
                  </select>
                )}
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
                    placeholder="e.g. Month 1 Course Feedback or Term-End Faculty Review"
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
                      placeholder="Instructions or focus of this evaluation"
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

              {/* Custom Questions Builder */}
              <div className="pt-2 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Questions ({questions.length})
                  </span>

                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => handleAddQuestion('rating')}
                      className="px-2 py-1 text-xs font-medium bg-teal-50 hover:bg-teal-100 text-teal-800 rounded border border-teal-200"
                    >
                      + Rating
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddQuestion('multiple_choice')}
                      className="px-2 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200"
                    >
                      + Options
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddQuestion('text')}
                      className="px-2 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200"
                    >
                      + Comment
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {questions.map((q, idx) => {
                    const isAssignedToTeacher = Boolean(q.teacherId);

                    return (
                      <div
                        key={q.id}
                        className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="w-5 h-5 rounded bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>

                          <input
                            type="text"
                            required
                            placeholder="Question statement..."
                            value={q.text}
                            onChange={(e) => handleUpdateQuestion(q.id, { text: e.target.value })}
                            className="flex-1 px-2.5 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                          />

                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="text-slate-400 hover:text-red-500 p-1"
                            title="Delete Question"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Multiple Choice Options Builder */}
                        {q.type === 'multiple_choice' && (
                          <div className="pl-7 space-y-2 pt-1 border-t border-slate-200/60">
                            <span className="text-[11px] font-semibold text-slate-600 block">
                              Options Choices:
                            </span>
                            <div className="space-y-1.5">
                              {(q.options || ['Option A', 'Option B']).map((opt, optIdx) => (
                                <div key={optIdx} className="flex items-center space-x-1.5">
                                  <span className="text-[11px] font-mono text-slate-400 w-4 text-center">
                                    {String.fromCharCode(65 + optIdx)}.
                                  </span>
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) =>
                                      handleUpdateOption(q.id, optIdx, e.target.value)
                                    }
                                    placeholder={`Option ${optIdx + 1}`}
                                    className="flex-1 px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteOption(q.id, optIdx)}
                                    className="text-slate-400 hover:text-red-500 p-1"
                                    title="Delete option"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAddOption(q.id)}
                              className="inline-flex items-center space-x-1 text-xs font-semibold text-teal-700 hover:text-teal-800"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Option</span>
                            </button>
                          </div>
                        )}

                        {/* Controls Bar for this Question */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pl-7 pt-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Question Type */}
                            <select
                              value={q.type}
                              onChange={(e) =>
                                handleUpdateQuestion(q.id, {
                                  type: e.target.value as QuestionType,
                                  scaleMax: e.target.value === 'rating' ? 5 : undefined,
                                  options: e.target.value === 'multiple_choice' ? ['Option A', 'Option B', 'Option C'] : undefined,
                                })
                              }
                              className="px-2 py-0.5 text-xs border border-slate-300 rounded bg-white text-slate-700 font-medium"
                            >
                              <option value="rating">Rating Scale</option>
                              <option value="multiple_choice">Multiple Choice</option>
                              <option value="text">Written Text</option>
                              <option value="yes_no">Yes / No</option>
                            </select>

                            {/* Rating scale size */}
                            {q.type === 'rating' && (
                              <select
                                value={q.scaleMax || 5}
                                onChange={(e) =>
                                  handleUpdateQuestion(q.id, {
                                    scaleMax: Number(e.target.value),
                                  })
                                }
                                className="px-2 py-0.5 text-xs border border-teal-300 rounded bg-teal-50 text-teal-900 font-bold"
                              >
                                <option value={5}>Scale 1 to 5</option>
                                <option value={10}>Scale 1 to 10</option>
                                <option value={3}>Scale 1 to 3</option>
                              </select>
                            )}

                            {/* Assign Question to Teacher Checkbox & Dropdown */}
                            {batchTeachers.length > 0 && (
                              <div className="flex items-center space-x-1.5 bg-white px-2 py-0.5 rounded border border-slate-300">
                                <label className="flex items-center space-x-1 text-[11px] font-medium text-slate-700 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isAssignedToTeacher}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        handleUpdateQuestion(q.id, {
                                          teacherId: batchTeachers[0]?.id || '',
                                        });
                                      } else {
                                        handleUpdateQuestion(q.id, { teacherId: '' });
                                      }
                                    }}
                                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                  />
                                  <span>Assign to teacher</span>
                                </label>

                                {isAssignedToTeacher && (
                                  <select
                                    value={q.teacherId || ''}
                                    onChange={(e) =>
                                      handleUpdateQuestion(q.id, { teacherId: e.target.value })
                                    }
                                    className="px-1.5 py-0.5 text-xs border border-amber-300 bg-amber-50 text-amber-900 font-semibold rounded"
                                  >
                                    {batchTeachers.map((t) => (
                                      <option key={t.id} value={t.id}>
                                        {t.name}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
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
                            <span>Required</span>
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
                {questions.length} questions • Single submission enforced
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
