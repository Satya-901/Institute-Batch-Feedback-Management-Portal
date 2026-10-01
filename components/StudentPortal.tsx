'use client';

import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  KeyRound,
  LogIn,
  LogOut,
  ClipboardList,
  CheckCircle2,
  Clock,
  Layers,
  Send,
  Lock,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Users2,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';
import {
  StudentItem,
  FeedbackForm,
  FeedbackResponse,
  BatchItem,
  ClassItem,
  TeacherItem,
} from '@/types';
import {
  updateStudentPassword,
  submitFeedbackResponse,
  hasStudentSubmitted,
} from '@/lib/storage';
import {
  toastSuccess,
  toastError,
  toastInfo,
  alertSuccess,
  alertWarning,
  confirmAction,
} from '@/lib/notification';

interface StudentPortalProps {
  students: StudentItem[];
  forms: FeedbackForm[];
  responses: FeedbackResponse[];
  batches: BatchItem[];
  classes: ClassItem[];
  teachers: TeacherItem[];
  currentStudent: StudentItem | null;
  setCurrentStudent: (student: StudentItem | null) => void;
  targetFormId?: string | null;
  onDataChanged: () => void;
  onBackToAdmin?: () => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  students,
  forms,
  responses,
  batches,
  classes,
  teachers,
  currentStudent,
  setCurrentStudent,
  targetFormId,
  onDataChanged,
}) => {
  // Login form states
  const [loginStudentId, setLoginStudentId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Password Change state
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Active form to fill
  const [selectedFormToFillId, setSelectedFormToFillId] = useState<string | null>(null);
  const activeFormToFillId = selectedFormToFillId ?? targetFormId ?? null;
  const setActiveFormToFillId = setSelectedFormToFillId;

  // Selected teacher for evaluation within the form
  const [evaluatingTeacherId, setEvaluatingTeacherId] = useState<string>('');

  // Form answer answers state: questionId -> value
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle student login
  const handleStudentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = loginStudentId.trim().toUpperCase();
    const student = students.find((s) => s.studentId.toUpperCase() === cleanId);

    if (!student) {
      toastError(`No student registered with ID "${cleanId}"`);
      return;
    }

    const validPassword = student.password || student.dob;
    if (loginPassword.trim() !== validPassword.trim()) {
      toastError('Invalid password. For first-time login, your password is your Date of Birth (YYYY-MM-DD).');
      return;
    }

    setCurrentStudent(student);
    toastSuccess(`Welcome back, ${student.name}!`);
  };

  // Handle password change
  const handleSaveNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent) return;
    if (newPassword.length < 4) {
      toastError('New password must be at least 4 characters');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toastError('Passwords do not match');
      return;
    }

    const success = updateStudentPassword(currentStudent.studentId, newPassword);
    if (success) {
      alertSuccess('Password Updated', 'Your student account password has been changed successfully.');
      setShowPasswordChangeModal(false);
      setNewPassword('');
      setConfirmNewPassword('');
      onDataChanged();
    }
  };

  // Find forms applicable to this student's batch
  const studentBatch = useMemo(() => {
    if (!currentStudent) return null;
    return batches.find((b) => b.id === currentStudent.batchId);
  }, [currentStudent, batches]);

  const studentClass = useMemo(() => {
    if (!studentBatch) return null;
    return classes.find((c) => c.id === studentBatch.classId);
  }, [studentBatch, classes]);

  const applicableForms = useMemo(() => {
    if (!currentStudent) return [];
    return forms.filter((f) => f.batchId === currentStudent.batchId);
  }, [currentStudent, forms]);

  // Active form object if filling
  const activeForm = useMemo(() => {
    if (!activeFormToFillId) return null;
    return forms.find((f) => f.id === activeFormToFillId);
  }, [activeFormToFillId, forms]);

  // Teachers assigned to this form's batch
  const formBatchTeachers = useMemo(() => {
    if (!activeForm) return [];
    return teachers.filter((t) => t.assignedBatchIds.includes(activeForm.batchId));
  }, [activeForm, teachers]);

  // Set default evaluating teacher when form loads or teachers change
  const currentEvaluatingTeacherId = useMemo(() => {
    if (evaluatingTeacherId) return evaluatingTeacherId;
    if (!currentStudent || !activeForm || formBatchTeachers.length === 0) return '';
    // Find first teacher not yet submitted by student
    const unsubmitted = formBatchTeachers.find(
      (t) => !hasStudentSubmitted(activeForm.id, currentStudent.studentId, t.id)
    );
    return unsubmitted ? unsubmitted.id : formBatchTeachers[0]?.id || '';
  }, [evaluatingTeacherId, formBatchTeachers, currentStudent, activeForm]);

  // Check form expiration
  const isFormExpired = useMemo(() => {
    if (!activeForm) return false;
    if (activeForm.status === 'closed') return true;
    if (activeForm.expiresAt) {
      const expDate = new Date(activeForm.expiresAt);
      const now = new Date();
      // Compare at end of day
      expDate.setHours(23, 59, 59, 999);
      return now > expDate;
    }
    return false;
  }, [activeForm]);

  // Questions to display for the currently selected teacher:
  // Show Common questions + Questions specifically for currentEvaluatingTeacherId
  const relevantQuestions = useMemo(() => {
    if (!activeForm) return [];
    if (formBatchTeachers.length === 0) return activeForm.questions;

    return activeForm.questions.filter((q) => {
      // Common question (no teacher assigned)
      if (!q.teacherId) return true;
      // Teacher specific question matching currently evaluated teacher
      return q.teacherId === currentEvaluatingTeacherId;
    });
  }, [activeForm, formBatchTeachers, currentEvaluatingTeacherId]);

  // Check if student has already submitted for the current evaluated teacher
  const isCurrentTeacherSubmitted = useMemo(() => {
    if (!currentStudent || !activeForm) return false;
    const cleanId = currentStudent.studentId.trim().toUpperCase();
    if (formBatchTeachers.length > 0 && currentEvaluatingTeacherId) {
      return responses.some(
        (r) =>
          r.formId === activeForm.id &&
          r.studentId.toUpperCase() === cleanId &&
          r.teacherId === currentEvaluatingTeacherId
      );
    }
    return responses.some(
      (r) => r.formId === activeForm.id && r.studentId.toUpperCase() === cleanId
    );
  }, [currentStudent, activeForm, formBatchTeachers, currentEvaluatingTeacherId, responses]);

  // Check if ALL teachers in this batch have been submitted
  const areAllTeachersSubmitted = useMemo(() => {
    if (!currentStudent || !activeForm) return false;
    const cleanId = currentStudent.studentId.trim().toUpperCase();
    if (formBatchTeachers.length === 0) {
      return responses.some(
        (r) => r.formId === activeForm.id && r.studentId.toUpperCase() === cleanId
      );
    }
    return formBatchTeachers.every((t) =>
      responses.some(
        (r) =>
          r.formId === activeForm.id &&
          r.studentId.toUpperCase() === cleanId &&
          r.teacherId === t.id
      )
    );
  }, [currentStudent, activeForm, formBatchTeachers, responses]);

  // Open a form to fill
  const handleStartForm = (form: FeedbackForm) => {
    if (!currentStudent) return;
    setActiveFormToFillId(form.id);
    setEvaluatingTeacherId('');
    setAnswers({});
  };

  // Handle question answer change
  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  // Submit response
  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent || !activeForm) return;

    // Check expiration
    if (isFormExpired) {
      await alertWarning('Evaluation Closed', 'This feedback link has expired and is no longer accepting submissions.');
      return;
    }

    // Check if duplicate submission for this teacher
    if (isCurrentTeacherSubmitted) {
      await alertWarning(
        'Already Submitted',
        'You have already submitted your evaluation for this faculty member.'
      );
      return;
    }

    // Verify required questions
    for (const q of relevantQuestions) {
      if (q.required && (answers[q.id] === undefined || answers[q.id] === '')) {
        toastError(`Please answer the required question: "${q.text.slice(0, 40)}..."`);
        return;
      }
    }

    const currentTeacherObj = formBatchTeachers.find((t) => t.id === currentEvaluatingTeacherId);
    const targetLabel = currentTeacherObj ? `for ${currentTeacherObj.name}` : '';

    const confirmed = await confirmAction({
      title: `Submit Evaluation ${targetLabel}?`,
      text: 'Are you sure you want to submit? Once submitted, your feedback is recorded permanently and cannot be modified.',
      confirmButtonText: 'Yes, Submit Feedback',
      cancelButtonText: 'Review Answers',
      isDestructive: false,
    });

    if (confirmed) {
      setIsSubmitting(true);
      const res = submitFeedbackResponse({
        formId: activeForm.id,
        batchId: activeForm.batchId,
        studentId: currentStudent.studentId,
        studentName: currentStudent.name,
        teacherId: currentEvaluatingTeacherId || undefined,
        answers,
      });
      setIsSubmitting(false);

      if (res.success) {
        await alertSuccess(
          'Feedback Recorded',
          `Your feedback ${targetLabel} has been recorded successfully.`
        );
        toastSuccess('Feedback submitted!');
        setAnswers({});

        // Automatically move to the next unsubmitted teacher if available
        const nextUnsubmitted = formBatchTeachers.find(
          (t) =>
            t.id !== currentEvaluatingTeacherId &&
            !hasStudentSubmitted(activeForm.id, currentStudent.studentId, t.id)
        );
        if (nextUnsubmitted) {
          setEvaluatingTeacherId(nextUnsubmitted.id);
        }

        onDataChanged();
      } else {
        toastError(res.message);
      }
    }
  };

  // If student is NOT logged in, show Login Screen
  if (!currentStudent) {
    return (
      <div className="max-w-md mx-auto my-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-slate-900 text-white p-6 text-center">
            <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-md">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold">Student Portal Login</h2>
            <p className="text-xs text-slate-300 mt-1">
              Sign in with your Student ID and Date of Birth password
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleStudentLogin} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Student ID
              </label>
              <input
                type="text"
                required
                placeholder="e.g. STU101"
                value={loginStudentId}
                onChange={(e) => setLoginStudentId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm font-mono uppercase border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password (Default: Date of Birth)
              </label>
              <input
                type="password"
                required
                placeholder="YYYY-MM-DD or custom password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                For first-time login, your password is your Date of Birth in format <code>YYYY-MM-DD</code>.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center space-x-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Log In to Submit Feedback</span>
            </button>
          </form>

          {/* Footer note */}
          <div className="bg-slate-50 p-3.5 border-t border-slate-200 text-center text-xs text-slate-500">
            <span className="font-mono text-[11px] text-slate-400">Strict Single-Submission Enforced</span>
          </div>
        </div>
      </div>
    );
  }

  // If student IS logged in, render Student View
  return (
    <div className="space-y-6">
      {/* Student Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
            {currentStudent.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-100">{currentStudent.name}</h2>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-teal-300 border border-slate-700">
                {currentStudent.studentId}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Class: {studentClass?.name || 'Class'} • Batch: {studentBatch?.name || 'Batch'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => setShowPasswordChangeModal(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            <span>Change Password</span>
          </button>
          <button
            onClick={() => setCurrentStudent(null)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-900/50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Questionnaire or Form Selector */}
      {activeForm ? (
        /* Questionnaire View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 space-y-6">
          {/* Header of Form */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between pb-4 border-b border-slate-100 gap-3">
            <div>
              <button
                onClick={() => setActiveFormToFillId(null)}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold mb-2 inline-flex items-center space-x-1"
              >
                <span>← Back to Batch Forms</span>
              </button>
              <h2 className="text-xl font-bold text-slate-900">{activeForm.title}</h2>
              {activeForm.description && (
                <p className="text-xs text-slate-600 mt-1">{activeForm.description}</p>
              )}
            </div>

            <div className="shrink-0 text-right">
              {isFormExpired ? (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span>Evaluation Closed / Expired</span>
                </span>
              ) : areAllTeachersSubmitted ? (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>All Evaluations Recorded</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>Strict Single Submission</span>
                </span>
              )}
            </div>
          </div>

          {/* Expired Notice */}
          {isFormExpired ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center space-y-3">
              <AlertTriangle className="w-10 h-10 text-amber-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">
                This Feedback Form Has Expired
              </h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Submissions for this evaluation are closed. If you have any inquiries, please contact your batch administrator.
              </p>
              <button
                onClick={() => setActiveFormToFillId(null)}
                className="mt-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold"
              >
                Return to My Forms
              </button>
            </div>
          ) : areAllTeachersSubmitted ? (
            /* All Teachers Completed Notice */
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-6 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h3 className="text-base font-bold text-emerald-950">
                You have completed all evaluations for this form!
              </h3>
              <p className="text-xs text-emerald-800 max-w-md mx-auto">
                Feedback for all assigned faculty members in your batch has been successfully submitted and locked. Thank you!
              </p>
              <button
                onClick={() => setActiveFormToFillId(null)}
                className="mt-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
              >
                Back to All Forms
              </button>
            </div>
          ) : (
            /* Active Questionnaire Form */
            <form onSubmit={handleSubmitResponse} className="space-y-6">
              {/* Teacher Selector if batch has multiple teachers */}
              {formBatchTeachers.length > 0 && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                      <Users2 className="w-4 h-4 text-teal-600" />
                      <span>Select Faculty to Evaluate:</span>
                    </label>

                    <select
                      value={currentEvaluatingTeacherId}
                      onChange={(e) => {
                        setEvaluatingTeacherId(e.target.value);
                        setAnswers({});
                      }}
                      className="px-3 py-1.5 text-xs sm:text-sm font-semibold border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    >
                      {formBatchTeachers.map((t) => {
                        const isDone = hasStudentSubmitted(
                          activeForm.id,
                          currentStudent.studentId,
                          t.id
                        );
                        return (
                          <option
                            key={t.id}
                            value={t.id}
                            disabled={isDone}
                            className={isDone ? 'text-slate-400 bg-slate-100' : 'text-slate-900 font-semibold'}
                          >
                            {isDone ? `✓ ${t.name} (Submitted)` : `${t.name} (Pending)`}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Questions below include common course questions and specific questions assigned to the selected faculty member. Teachers with feedback already submitted are disabled.
                  </p>
                </div>
              )}

              {/* Already Submitted for this specific teacher notice */}
              {isCurrentTeacherSubmitted ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <p className="text-xs font-bold text-emerald-900">
                    Feedback for this faculty member has already been submitted!
                  </p>
                  <p className="text-[11px] text-emerald-700">
                    Please choose another pending teacher from the dropdown above.
                  </p>
                </div>
              ) : (
                /* Questions Loop */
                <div className="space-y-4">
                  {relevantQuestions.map((q, idx) => {
                    const specificTeacher = teachers.find((t) => t.id === q.teacherId);

                    return (
                      <div
                        key={q.id}
                        className="p-5 rounded-xl border border-slate-200 bg-slate-50/40 space-y-3"
                      >
                        {specificTeacher && (
                          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold">
                            <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                            <span>Specific Question for: {specificTeacher.name}</span>
                          </div>
                        )}

                        <div className="flex items-start space-x-3">
                          <span className="w-6 h-6 rounded-md bg-teal-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">
                              {q.text} {q.required && <span className="text-red-500">*</span>}
                            </h4>
                            {q.type === 'rating' && (
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Scale: 1 ({q.scaleLabels?.min || 'Low'}) to {q.scaleMax || 5} (
                                {q.scaleLabels?.max || 'High'})
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Rating Selector */}
                        {q.type === 'rating' && (
                          <div className="pl-9 pt-2">
                            <div className="flex flex-wrap gap-2">
                              {Array.from({ length: q.scaleMax || 5 }, (_, i) => i + 1).map((val) => {
                                const isSelected = answers[q.id] === val;
                                return (
                                  <button
                                    type="button"
                                    key={val}
                                    onClick={() => handleAnswerChange(q.id, val)}
                                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl text-sm font-bold transition-all flex flex-col items-center justify-center ${
                                      isSelected
                                        ? 'bg-teal-600 text-white shadow-md scale-105'
                                        : 'bg-white text-slate-700 border border-slate-300 hover:border-teal-500 hover:bg-teal-50/50'
                                    }`}
                                  >
                                    <span>{val}</span>
                                    <span className="text-[9px] -mt-1 opacity-80">★</span>
                                  </button>
                                );
                              })}
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 max-w-xs">
                              <span>{q.scaleLabels?.min || 'Needs Improvement'}</span>
                              <span>{q.scaleLabels?.max || 'Excellent'}</span>
                            </div>
                          </div>
                        )}

                        {/* Multiple Choice */}
                        {q.type === 'multiple_choice' && (
                          <div className="pl-9 pt-2 space-y-2">
                            {(q.options || ['Option A', 'Option B']).map((opt, optIdx) => {
                              const isChecked = answers[q.id] === opt;
                              return (
                                <label
                                  key={optIdx}
                                  className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                    isChecked
                                      ? 'bg-teal-50 border-teal-500 text-teal-900 font-semibold'
                                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`question-${q.id}`}
                                    value={opt}
                                    checked={isChecked}
                                    onChange={() => handleAnswerChange(q.id, opt)}
                                    className="text-teal-600 focus:ring-teal-500"
                                  />
                                  <span className="text-xs">{opt}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}

                        {/* Yes / No */}
                        {q.type === 'yes_no' && (
                          <div className="pl-9 pt-2 flex space-x-3">
                            {['Yes', 'No'].map((opt) => {
                              const isChecked = answers[q.id] === opt;
                              return (
                                <button
                                  type="button"
                                  key={opt}
                                  onClick={() => handleAnswerChange(q.id, opt)}
                                  className={`px-5 py-2 rounded-lg text-xs font-bold transition-all border ${
                                    isChecked
                                      ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                                      : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                                  }`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Text Comment */}
                        {q.type === 'text' && (
                          <div className="pl-9 pt-2">
                            <textarea
                              rows={3}
                              placeholder="Write your feedback here..."
                              value={answers[q.id] || ''}
                              onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                              className="w-full p-3 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setActiveFormToFillId(null)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center space-x-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-md transition-all active:scale-95"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>
                        {formBatchTeachers.length > 0 && currentEvaluatingTeacherId
                          ? `Submit Feedback for ${
                              formBatchTeachers.find((t) => t.id === currentEvaluatingTeacherId)?.name || 'Faculty'
                            }`
                          : 'Submit Evaluation'}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
      ) : (
        /* Form Selector Cards */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <ClipboardList className="w-4 h-4 text-teal-600" />
              <span>Available Feedback Evaluations for Your Batch</span>
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              {applicableForms.length} evaluation(s)
            </span>
          </div>

          {applicableForms.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-xs">
              <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No evaluations active</p>
              <p className="text-xs text-slate-500 mt-1">
                There are currently no active feedback forms published for your batch ({studentBatch?.name}).
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {applicableForms.map((form) => {
                const bTeachers = teachers.filter((t) => t.assignedBatchIds.includes(form.batchId));
                const isFormDone = bTeachers.length > 0
                  ? bTeachers.every((t) => hasStudentSubmitted(form.id, currentStudent.studentId, t.id))
                  : hasStudentSubmitted(form.id, currentStudent.studentId);

                const isExpired = form.status === 'closed' || (form.expiresAt && new Date(form.expiresAt) < new Date());

                return (
                  <div
                    key={form.id}
                    className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                          {studentBatch?.name}
                        </span>
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold border ${
                            isFormDone
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : isExpired
                              ? 'bg-slate-100 text-slate-600 border-slate-200'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          {isFormDone ? 'Completed' : isExpired ? 'Expired' : 'Active'}
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-slate-900 mt-2.5">{form.title}</h4>
                      {form.description && (
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2">{form.description}</p>
                      )}

                      <div className="mt-3 flex items-center space-x-3 text-xs text-slate-500">
                        <span>{form.questions.length} questions</span>
                        {form.expiresAt && (
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>Valid: {form.expiresAt}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-mono">
                        Code: {form.shareableCode}
                      </span>

                      {isExpired ? (
                        <span className="text-xs font-medium text-slate-400">
                          Expired
                        </span>
                      ) : isFormDone ? (
                        <button
                          onClick={() => handleStartForm(form)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200"
                        >
                          View Receipt
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartForm(form)}
                          className="inline-flex items-center space-x-1 px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs"
                        >
                          <span>Fill Feedback</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordChangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-base mb-1">Update Password</h3>
            <p className="text-xs text-slate-500 mb-4">
              Replace your default Date of Birth password with a personal password.
            </p>

            <form onSubmit={handleSaveNewPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPasswordChangeModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-lg"
                >
                  Save Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
