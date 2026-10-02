'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  GraduationCap,
  ClipboardList,
  CheckCircle2,
  Clock,
  Layers,
  Send,
  Users2,
  AlertTriangle,
  UserCheck,
  Check,
  Sparkles,
  School,
  Award,
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
  submitFeedbackResponse,
  hasStudentSubmitted,
  getSavedStudentProfile,
  setSavedStudentProfile,
} from '@/lib/storage';
import {
  toastSuccess,
  toastError,
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
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  forms,
  responses,
  batches,
  classes,
  teachers,
  targetFormId,
  onDataChanged,
}) => {
  // Load initial student details from localStorage if previously entered
  const savedProfile = useMemo(() => {
    return getSavedStudentProfile();
  }, []);

  // Student Identity Fields (NO PASSWORD/LOGIN NEEDED)
  const [studentId, setStudentId] = useState<string>(savedProfile?.studentId || '');
  const [studentName, setStudentName] = useState<string>(savedProfile?.name || '');
  const [selectedClassId, setSelectedClassId] = useState<string>(
    savedProfile?.classId || classes[0]?.id || ''
  );
  const [selectedBatchId, setSelectedBatchId] = useState<string>(
    savedProfile?.batchId || 'all'
  );
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');

  // Form answer answers state: questionId -> optionText or commentText
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available batches for selected class
  const classBatches = useMemo(() => {
    if (!selectedClassId) return [];
    return batches.filter((b) => b.classId === selectedClassId);
  }, [selectedClassId, batches]);

  // Find active form for selected class / batch, or use targetFormId if specified
  const activeForm = useMemo(() => {
    if (targetFormId) {
      const targeted = forms.find((f) => f.id === targetFormId);
      if (targeted) return targeted;
    }

    if (!selectedClassId) return null;

    if (classBatches.length > 0) {
      // Class has batches: find form matching selected batch, or form for class with batchId === 'all'
      if (selectedBatchId && selectedBatchId !== 'all') {
        const batchMatch = forms.find(
          (f) => f.status === 'active' && f.batchId === selectedBatchId
        );
        if (batchMatch) return batchMatch;
      }
      return (
        forms.find((f) => f.status === 'active' && f.classId === selectedClassId) || null
      );
    } else {
      // Class has NO batches (e.g. NEET Dropper / direct class)
      const classDirectForm = forms.find(
        (f) => f.status === 'active' && f.classId === selectedClassId
      );
      if (classDirectForm) return classDirectForm;

      return forms.find((f) => f.status === 'active' && f.batchId === 'all') || null;
    }
  }, [targetFormId, forms, selectedClassId, selectedBatchId, classBatches.length]);

  // Teachers available for this class / batch
  const availableTeachers = useMemo(() => {
    if (selectedBatchId && selectedBatchId !== 'all') {
      const batchTeachers = teachers.filter((t) => t.assignedBatchIds.includes(selectedBatchId));
      if (batchTeachers.length > 0) return batchTeachers;
    }
    if (selectedClassId) {
      const classBatchIds = batches.filter((b) => b.classId === selectedClassId).map((b) => b.id);
      if (classBatchIds.length > 0) {
        const matched = teachers.filter(
          (t) =>
            t.assignedBatchIds.length === 0 ||
            t.assignedBatchIds.some((bid) => classBatchIds.includes(bid))
        );
        if (matched.length > 0) return matched;
      }
    }
    return teachers;
  }, [selectedClassId, selectedBatchId, batches, teachers]);

  // Compute effective teacher to evaluate
  const effectiveTeacherId = useMemo(() => {
    if (selectedTeacherId && availableTeachers.some((t) => t.id === selectedTeacherId)) {
      return selectedTeacherId;
    }
    const cleanId = studentId.trim().toUpperCase();
    if (cleanId && activeForm) {
      const firstUnsubmitted = availableTeachers.find(
        (t) =>
          !responses.some(
            (r) =>
              r.formId === activeForm.id &&
              r.studentId.toUpperCase() === cleanId &&
              r.teacherId === t.id
          )
      );
      if (firstUnsubmitted) return firstUnsubmitted.id;
    }
    return availableTeachers[0]?.id || '';
  }, [selectedTeacherId, availableTeachers, studentId, activeForm, responses]);

  // Check if form is expired
  const isFormExpired = useMemo(() => {
    if (!activeForm) return false;
    if (activeForm.status === 'closed') return true;
    if (activeForm.expiresAt) {
      const expDate = new Date(activeForm.expiresAt);
      const now = new Date();
      expDate.setHours(23, 59, 59, 999);
      return now > expDate;
    }
    return false;
  }, [activeForm]);

  // Relevant questions for the selected teacher (Common + Teacher specific)
  const relevantQuestions = useMemo(() => {
    if (!activeForm) return [];
    if (!effectiveTeacherId) return activeForm.questions;

    return activeForm.questions.filter((q) => {
      if (!q.teacherId) return true; // Common question
      return q.teacherId === effectiveTeacherId; // Assigned to this teacher
    });
  }, [activeForm, effectiveTeacherId]);

  // Check if current selected teacher has already received feedback from this student
  const isSelectedTeacherSubmitted = useMemo(() => {
    if (!studentId.trim() || !activeForm || !effectiveTeacherId) return false;
    const cleanId = studentId.trim().toUpperCase();
    return responses.some(
      (r) =>
        r.formId === activeForm.id &&
        r.studentId.toUpperCase() === cleanId &&
        r.teacherId === effectiveTeacherId
    );
  }, [studentId, activeForm, effectiveTeacherId, responses]);

  // Check if ALL available teachers have been evaluated by this student
  const areAllTeachersSubmitted = useMemo(() => {
    if (!studentId.trim() || !activeForm || availableTeachers.length === 0) return false;
    const cleanId = studentId.trim().toUpperCase();
    return availableTeachers.every((t) =>
      responses.some(
        (r) =>
          r.formId === activeForm.id &&
          r.studentId.toUpperCase() === cleanId &&
          r.teacherId === t.id
      )
    );
  }, [studentId, activeForm, availableTeachers, responses]);

  // Handle question answer change
  const handleAnswerChange = (questionId: string, value: string | number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  // Submit response
  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!studentId.trim()) {
      toastError('Please enter your Student ID / Roll Number');
      return;
    }
    if (!studentName.trim()) {
      toastError('Please enter your Full Name');
      return;
    }
    if (!selectedClassId) {
      toastError('Please select your Class');
      return;
    }
    // Only require batch selection if the selected class has batches!
    if (classBatches.length > 0 && (!selectedBatchId || selectedBatchId === 'all' || selectedBatchId === '')) {
      toastError('Please select your Batch');
      return;
    }
    if (!effectiveTeacherId) {
      toastError('Please select the Faculty member you are evaluating');
      return;
    }
    if (!activeForm) {
      toastError('No active feedback form found for the selected class');
      return;
    }
    if (isFormExpired) {
      alertWarning('Evaluation Closed', 'This feedback form has expired and is no longer accepting submissions.');
      return;
    }
    if (isSelectedTeacherSubmitted) {
      alertWarning('Already Submitted', 'You have already submitted feedback for this faculty member.');
      return;
    }

    // Verify required questions
    for (const q of relevantQuestions) {
      if (q.required && (answers[q.id] === undefined || answers[q.id] === '')) {
        toastError(`Please answer: "${q.text.slice(0, 40)}..."`);
        return;
      }
    }

    const currentTeacherObj = teachers.find((t) => t.id === effectiveTeacherId);
    const teacherName = currentTeacherObj ? currentTeacherObj.name : 'Selected Faculty';

    const confirmed = await confirmAction({
      title: `Submit Feedback for ${teacherName}?`,
      text: 'Are you sure you want to submit? Once submitted, your response is recorded and cannot be modified.',
      confirmButtonText: 'Yes, Submit Evaluation',
      cancelButtonText: 'Review Answers',
      isDestructive: false,
    });

    if (confirmed) {
      setIsSubmitting(true);

      // Compute total marks and max possible marks from Multiple Choice questions
      let totalScore = 0;
      let maxPossibleScore = 0;

      for (const q of relevantQuestions) {
        if (q.type === 'multiple_choice' && q.options) {
          const maxQScore = Math.max(...q.options.map((o) => o.score || 0), 0);
          maxPossibleScore += maxQScore;

          const chosenOpt = q.options.find(
            (o) => o.text === answers[q.id] || o.id === answers[q.id]
          );
          if (chosenOpt) {
            totalScore += Number(chosenOpt.score) || 0;
          }
        }
      }

      const scorePercentage =
        maxPossibleScore > 0 ? Number(((totalScore / maxPossibleScore) * 100).toFixed(1)) : 0;

      const res = submitFeedbackResponse({
        formId: activeForm.id,
        classId: selectedClassId,
        batchId: selectedBatchId || 'all',
        studentId: studentId.trim().toUpperCase(),
        studentName: studentName.trim(),
        teacherId: effectiveTeacherId,
        answers,
        totalScore,
        maxPossibleScore,
        scorePercentage,
      });

      setIsSubmitting(false);

      if (res.success) {
        // Save student info in localStorage so it stays pre-filled for the next teacher!
        setSavedStudentProfile({
          studentId: studentId.trim().toUpperCase(),
          name: studentName.trim(),
          classId: selectedClassId,
          batchId: selectedBatchId,
        });

        await alertSuccess(
          'Feedback Recorded Successfully!',
          `Your evaluation for ${teacherName} has been submitted (${totalScore}/${maxPossibleScore} marks). Details are saved on this device so you can easily evaluate remaining teachers.`
        );

        toastSuccess(`Feedback recorded for ${teacherName}`);
        setAnswers({});

        // Auto move to the next unsubmitted teacher
        const nextPending = availableTeachers.find(
          (t) =>
            t.id !== selectedTeacherId &&
            !responses.some(
              (r) =>
                r.formId === activeForm.id &&
                r.studentId.toUpperCase() === studentId.trim().toUpperCase() &&
                r.teacherId === t.id
            )
        );

        if (nextPending) {
          setSelectedTeacherId(nextPending.id);
        }

        onDataChanged();
      } else {
        toastError(res.message);
      }
    }
  };

  const selectedTeacherObj = teachers.find((t) => t.id === effectiveTeacherId);

  return (
    <div className="space-y-6">
      {/* Student Portal Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Student Evaluation Portal</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Direct feedback submission. No password required. Data saved locally for quick multiple faculty evaluations.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-800 rounded-lg text-xs font-mono text-teal-400 border border-slate-700">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>Direct Submission</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-5 sm:p-6 space-y-6">
        {/* Step 1: Student Details & Class/Batch/Teacher Selection */}
        <div className="space-y-4 pb-5 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <span className="w-6 h-6 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center">
              1
            </span>
            <h3 className="font-bold text-slate-900 text-sm">
              Your Details & Faculty Selection (Saved Automatically)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            {/* Student ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Student ID / Roll No. *
              </label>
              <input
                type="text"
                required
                placeholder="Enter Student Roll No. or ID"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-xs sm:text-sm font-mono uppercase border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Student Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="Enter Student Full Name"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Select Class */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Class *
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => {
                  const newClassId = e.target.value;
                  setSelectedClassId(newClassId);
                  const matched = batches.filter((b) => b.classId === newClassId);
                  if (matched.length > 0) {
                    setSelectedBatchId('');
                  } else {
                    setSelectedBatchId('all');
                  }
                }}
                className="w-full px-3 py-2 text-xs sm:text-sm font-medium border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Select Batch */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Batch {classBatches.length > 0 ? '*' : '(Not Applicable)'}
              </label>
              {classBatches.length > 0 ? (
                <select
                  required
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm font-medium border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">-- Choose Batch --</option>
                  {classBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.code ? `(${b.code})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full px-3 py-2 text-xs sm:text-sm text-slate-600 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-between">
                  <span>Direct Class (No Batches)</span>
                  <span className="text-[10px] text-emerald-700 font-bold uppercase">No Batch Needed</span>
                </div>
              )}
            </div>
          </div>

          {/* Select Faculty Member */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <Users2 className="w-4 h-4 text-teal-600" />
                <span>Select Faculty Member to Evaluate:</span>
              </label>

              <select
                value={effectiveTeacherId}
                onChange={(e) => {
                  setSelectedTeacherId(e.target.value);
                  setAnswers({});
                }}
                className="px-3 py-2 text-xs sm:text-sm font-bold border border-teal-300 rounded-lg bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-teal-500 shadow-xs"
              >
                {availableTeachers.length === 0 ? (
                  <option value="">No faculty assigned</option>
                ) : (
                  availableTeachers.map((t) => {
                    const cleanId = studentId.trim().toUpperCase();
                    const isSubmitted =
                      cleanId && activeForm
                        ? responses.some(
                            (r) =>
                              r.formId === activeForm.id &&
                              r.studentId.toUpperCase() === cleanId &&
                              r.teacherId === t.id
                          )
                        : false;

                    return (
                      <option
                        key={t.id}
                        value={t.id}
                        disabled={isSubmitted}
                        className={isSubmitted ? 'text-slate-400 bg-slate-100' : 'text-slate-900 font-bold'}
                      >
                        {isSubmitted ? `✓ ${t.name} (Feedback Submitted - Disabled)` : `${t.name} (Pending Feedback)`}
                      </option>
                    );
                  })
                )}
              </select>
            </div>

            <p className="text-[11px] text-slate-500">
              Faculty members for whom you have already submitted feedback are marked with <strong>✓</strong> and disabled to prevent duplicate submissions.
            </p>
          </div>
        </div>

        {/* Step 2: Evaluation Questionnaire */}
        {!activeForm ? (
          <div className="py-8 text-center bg-slate-50 rounded-xl border border-slate-200">
            <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No active feedback form available</p>
            <p className="text-xs text-slate-500 mt-1">
              Please check back later or confirm with your institute coordinator.
            </p>
          </div>
        ) : isFormExpired ? (
          <div className="p-6 text-center bg-amber-50 rounded-xl border border-amber-200 space-y-2">
            <AlertTriangle className="w-10 h-10 text-amber-600 mx-auto" />
            <h3 className="font-bold text-amber-900 text-sm">Feedback Form Expired</h3>
            <p className="text-xs text-amber-800">
              The submission deadline for this feedback evaluation has passed.
            </p>
          </div>
        ) : areAllTeachersSubmitted ? (
          <div className="p-8 text-center bg-emerald-50 rounded-xl border border-emerald-200 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h3 className="font-bold text-emerald-950 text-base">
              All Faculty Members Have Been Evaluated!
            </h3>
            <p className="text-xs text-emerald-800 max-w-md mx-auto">
              You have submitted feedback for all faculty members in your class/batch. Your responses are locked and safely stored. Thank you!
            </p>
          </div>
        ) : isSelectedTeacherSubmitted ? (
          <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">
              Feedback Already Submitted for {selectedTeacherObj?.name}
            </h3>
            <p className="text-xs text-slate-500">
              Please choose another pending faculty member from the dropdown above to continue.
            </p>
          </div>
        ) : (
          /* Active Questions Form */
          <form onSubmit={handleSubmitResponse} className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Evaluating: <span className="text-teal-700">{selectedTeacherObj?.name || 'Faculty Member'}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{activeForm.title}</p>
              </div>

              <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2.5 py-1 rounded">
                {relevantQuestions.length} Questions
              </span>
            </div>

            <div className="space-y-5">
              {relevantQuestions.map((q, idx) => {
                const specificTeacher = teachers.find((t) => t.id === q.teacherId);

                return (
                  <div
                    key={q.id}
                    className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
                  >
                    {specificTeacher && (
                      <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold">
                        <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                        <span>Teacher Specific: {specificTeacher.name}</span>
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
                      </div>
                    </div>

                    {/* Question Type: Multiple Choice (4 Options) */}
                    {q.type === 'multiple_choice' && (
                      <div className="pl-9 pt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {(q.options || []).map((opt, optIdx) => {
                            const isSelected = answers[q.id] === opt.text;

                            return (
                              <label
                                key={opt.id || optIdx}
                                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-teal-50 border-teal-500 shadow-xs scale-[1.01]'
                                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                                }`}
                              >
                                <div className="flex items-center space-x-2.5">
                                  <input
                                    type="radio"
                                    name={`question-${q.id}`}
                                    value={opt.text}
                                    checked={isSelected}
                                    onChange={() => handleAnswerChange(q.id, opt.text)}
                                    className="text-teal-600 focus:ring-teal-500 h-4 w-4"
                                  />
                                  <span
                                    className={`text-xs font-semibold ${
                                      isSelected ? 'text-teal-950 font-bold' : 'text-slate-700'
                                    }`}
                                  >
                                    <span className="font-mono text-slate-400 mr-1.5">
                                      {String.fromCharCode(65 + optIdx)}.
                                    </span>
                                    {opt.text}
                                  </span>
                                </div>

                                {isSelected && (
                                  <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0 text-xs">
                                    <Check className="w-3 h-3" />
                                  </span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Question Type: Text Box */}
                    {q.type === 'text' && (
                      <div className="pl-9 pt-2">
                        <textarea
                          rows={3}
                          placeholder="Type your feedback, comments, or suggestions here..."
                          value={(answers[q.id] as string) || ''}
                          onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                          className="w-full p-3 text-xs sm:text-sm border border-slate-300 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs text-slate-400">
                Your feedback is confidential and recorded for academic quality improvement.
              </span>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center space-x-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 active:scale-95 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all"
              >
                <Send className="w-4 h-4" />
                <span>
                  Submit Feedback for {selectedTeacherObj?.name || 'Selected Faculty'}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
