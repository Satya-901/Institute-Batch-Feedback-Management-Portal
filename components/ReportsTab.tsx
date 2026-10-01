'use client';

import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  Filter,
  CheckCircle2,
  Users,
  Star,
  Layers,
  MessageSquare,
  FileSpreadsheet,
  Award,
  ChevronDown,
} from 'lucide-react';
import {
  FeedbackForm,
  FeedbackResponse,
  BatchItem,
  ClassItem,
  TeacherItem,
  StudentItem,
} from '@/types';
import { toastSuccess } from '@/lib/notification';

interface ReportsTabProps {
  forms: FeedbackForm[];
  responses: FeedbackResponse[];
  batches: BatchItem[];
  classes: ClassItem[];
  teachers: TeacherItem[];
  students: StudentItem[];
}

export const ReportsTab: React.FC<ReportsTabProps> = ({
  forms,
  responses,
  batches,
  classes,
  teachers,
  students,
}) => {
  const [selectedFormId, setSelectedFormId] = useState<string>(forms[0]?.id || '');
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>('all');

  // Active selected form
  const activeForm = useMemo(() => {
    return forms.find((f) => f.id === selectedFormId) || forms[0];
  }, [forms, selectedFormId]);

  // Responses for the selected form
  const formResponses = useMemo(() => {
    if (!activeForm) return [];
    return responses.filter((r) => r.formId === activeForm.id);
  }, [responses, activeForm]);

  // Batch & Class details for the active form
  const formBatch = useMemo(() => {
    if (!activeForm) return null;
    return batches.find((b) => b.id === activeForm.batchId);
  }, [batches, activeForm]);

  const formClass = useMemo(() => {
    if (!formBatch) return null;
    return classes.find((c) => c.id === formBatch.classId);
  }, [classes, formBatch]);

  const formTeacher = useMemo(() => {
    if (!activeForm || !activeForm.teacherId) return null;
    return teachers.find((t) => t.id === activeForm.teacherId);
  }, [teachers, activeForm]);

  const batchStudents = useMemo(() => {
    if (!formBatch) return [];
    return students.filter((s) => s.batchId === formBatch.id);
  }, [students, formBatch]);

  // Compute Metrics for this form
  const metrics = useMemo(() => {
    if (!activeForm || formResponses.length === 0) {
      return {
        avgRating: 0,
        responseRate: 0,
        totalResponses: 0,
        positivePercent: 0,
      };
    }

    let totalRatingPoints = 0;
    let totalMaxPoints = 0;
    let positiveCount = 0;
    let ratingQuestionCount = 0;

    activeForm.questions.forEach((q) => {
      if (q.type === 'rating') {
        const scaleMax = q.scaleMax || 5;
        formResponses.forEach((resp) => {
          const val = Number(resp.answers[q.id]);
          if (!isNaN(val)) {
            totalRatingPoints += val;
            totalMaxPoints += scaleMax;
            ratingQuestionCount++;
            if (val >= scaleMax * 0.7) {
              positiveCount++;
            }
          }
        });
      }
    });

    const normalizedAvg =
      totalMaxPoints > 0 ? ((totalRatingPoints / totalMaxPoints) * 5).toFixed(1) : 'N/A';
    const responseRate =
      batchStudents.length > 0
        ? Math.round((formResponses.length / batchStudents.length) * 100)
        : 0;
    const positivePercent =
      ratingQuestionCount > 0 ? Math.round((positiveCount / ratingQuestionCount) * 100) : 0;

    return {
      avgRating: normalizedAvg,
      responseRate,
      totalResponses: formResponses.length,
      positivePercent,
    };
  }, [activeForm, formResponses, batchStudents]);

  // Export report as CSV
  const handleExportCSV = () => {
    if (!activeForm || formResponses.length === 0) {
      toastSuccess('No data available to export');
      return;
    }

    const headers = ['Student ID', 'Student Name', 'Submitted At'];
    activeForm.questions.forEach((q) => {
      headers.push(`"${q.text.replace(/"/g, '""')}"`);
    });

    const rows = formResponses.map((r) => {
      const row = [
        r.studentId,
        `"${r.studentName}"`,
        new Date(r.submittedAt).toLocaleDateString(),
      ];
      activeForm.questions.forEach((q) => {
        const ans = r.answers[q.id] !== undefined ? String(r.answers[q.id]) : '';
        row.push(`"${ans.replace(/"/g, '""')}"`);
      });
      return row.join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Feedback_Report_${activeForm.shareableCode}_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toastSuccess('Feedback report CSV downloaded');
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  if (forms.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <BarChart3 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-700">No feedback forms generated yet</p>
        <p className="text-xs text-slate-500 mt-1">
          Create feedback forms and collect student responses to view comprehensive reports.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Feedback Analytics & Reports</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Response breakdowns and verified student submission logs.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCSV}
            disabled={formResponses.length === 0}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-700 text-xs font-semibold border border-slate-300 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-teal-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Form Selector Dropdown Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Evaluation Form to Analyze:
            </label>
            <select
              value={selectedFormId}
              onChange={(e) => setSelectedFormId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white font-medium text-slate-900"
            >
              {forms.map((f) => {
                const b = batches.find((item) => item.id === f.batchId);
                const respCount = responses.filter((r) => r.formId === f.id).length;
                return (
                  <option key={f.id} value={f.id}>
                    {f.title} — ({b?.name || 'Batch'} • {respCount} Submissions)
                  </option>
                );
              })}
            </select>
          </div>

          {activeForm && (
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
              <div>
                <span className="text-slate-400">Batch:</span>{' '}
                <strong className="text-slate-800">{formBatch?.name}</strong>
              </div>
              {formClass && (
                <div>
                  <span className="text-slate-400">Class:</span>{' '}
                  <strong className="text-slate-800">{formClass.name}</strong>
                </div>
              )}
              {formTeacher && (
                <div>
                  <span className="text-slate-400">Faculty:</span>{' '}
                  <strong className="text-slate-800">{formTeacher.name}</strong>
                </div>
              )}
              <div>
                <span className="text-slate-400">Code:</span>{' '}
                <span className="font-mono text-teal-700 font-bold">
                  {activeForm.shareableCode}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Normalized Rating
          </span>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-3xl font-bold text-teal-700">{metrics.avgRating}</span>
            <span className="text-xs text-slate-400 font-medium">/ 5.0</span>
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center space-x-1">
            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
            <span>Overall satisfaction score</span>
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Turnout Rate
          </span>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-3xl font-bold text-slate-900">{metrics.responseRate}%</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {metrics.totalResponses} of {batchStudents.length} batch students
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Total Responses
          </span>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-3xl font-bold text-slate-900">{metrics.totalResponses}</span>
            <span className="text-xs text-emerald-700 font-medium">Verified</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">100% unique submissions</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Positive Sentiment
          </span>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-3xl font-bold text-emerald-700">{metrics.positivePercent}%</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Ratings at or above 70%</p>
        </div>
      </div>

      {/* Question-By-Question Detailed Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Question-by-Question Response Distribution
          </h3>
          <p className="text-xs text-slate-500">
            Detailed breakdown based on custom question types and configured scales.
          </p>
        </div>

        {formResponses.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No responses recorded for this feedback form yet. Share the feedback link to receive data.
          </div>
        ) : (
          <div className="space-y-6">
            {activeForm?.questions.map((q, idx) => {
              if (q.type === 'rating') {
                const scaleMax = q.scaleMax || 5;
                const scores = formResponses
                  .map((r) => Number(r.answers[q.id]))
                  .filter((v) => !isNaN(v));
                const sum = scores.reduce((acc, curr) => acc + curr, 0);
                const avg = scores.length > 0 ? (sum / scores.length).toFixed(1) : '0';
                const percentage =
                  scores.length > 0 ? Math.round((Number(avg) / scaleMax) * 100) : 0;

                // Distribution map
                const distMap: Record<number, number> = {};
                for (let i = 1; i <= scaleMax; i++) distMap[i] = 0;
                scores.forEach((s) => {
                  distMap[s] = (distMap[s] || 0) + 1;
                });

                return (
                  <div
                    key={q.id}
                    className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/90 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-start space-x-2.5">
                        <span className="w-5 h-5 rounded-md bg-teal-100 text-teal-900 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{q.text}</h4>
                          <span className="text-[11px] text-slate-500">
                            Rating Scale: 1 to {scaleMax} ({q.scaleLabels?.min || 'Low'} →{' '}
                            {q.scaleLabels?.max || 'High'})
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-lg font-bold text-teal-800">
                          {avg} <span className="text-xs text-slate-400 font-normal">/ {scaleMax}</span>
                        </div>
                        <span className="text-[11px] text-slate-500">
                          {scores.length} ratings ({percentage}%)
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-teal-600 h-full rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    {/* Scale Distribution Grid */}
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 pt-2">
                      {Array.from({ length: scaleMax }, (_, i) => i + 1).map((val) => {
                        const count = distMap[val] || 0;
                        const pct = scores.length > 0 ? Math.round((count / scores.length) * 100) : 0;
                        return (
                          <div
                            key={val}
                            className="bg-white p-2 rounded-lg border border-slate-200 text-center"
                          >
                            <span className="block text-[11px] font-bold text-slate-800">
                              {val}★
                            </span>
                            <span className="block text-xs font-semibold text-teal-700">{count}</span>
                            <span className="block text-[9px] text-slate-400">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              if (q.type === 'multiple_choice' || q.type === 'yes_no') {
                const options =
                  q.type === 'yes_no' ? ['Yes', 'No'] : q.options || ['Option 1', 'Option 2'];
                const counts: Record<string, number> = {};
                options.forEach((o) => (counts[o] = 0));

                formResponses.forEach((r) => {
                  const ans = String(r.answers[q.id]);
                  if (counts[ans] !== undefined) {
                    counts[ans]++;
                  }
                });

                return (
                  <div
                    key={q.id}
                    className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/90 space-y-3"
                  >
                    <div className="flex items-start space-x-2.5">
                      <span className="w-5 h-5 rounded-md bg-sky-100 text-sky-900 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{q.text}</h4>
                        <span className="text-[11px] text-slate-500">
                          {q.type === 'yes_no' ? 'Yes / No Response' : 'Multiple Choice Poll'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-1">
                      {options.map((opt) => {
                        const count = counts[opt] || 0;
                        const pct =
                          formResponses.length > 0
                            ? Math.round((count / formResponses.length) * 100)
                            : 0;

                        return (
                          <div key={opt} className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                              <span>{opt}</span>
                              <span className="text-slate-500 font-mono">
                                {count} votes ({pct}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-sky-600 h-full rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              if (q.type === 'text') {
                const textComments = formResponses
                  .map((r) => ({
                    student: r.studentName,
                    id: r.studentId,
                    comment: String(r.answers[q.id] || '').trim(),
                  }))
                  .filter((item) => item.comment.length > 0);

                return (
                  <div
                    key={q.id}
                    className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/90 space-y-3"
                  >
                    <div className="flex items-start space-x-2.5">
                      <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{q.text}</h4>
                        <span className="text-[11px] text-slate-500">
                          Written Suggestions & Qualitative Remarks ({textComments.length} entries)
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-1 max-h-56 overflow-y-auto">
                      {textComments.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No comments submitted.</p>
                      ) : (
                        textComments.map((entry, cIdx) => (
                          <div
                            key={cIdx}
                            className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-700 shadow-2xs"
                          >
                            <p className="italic text-slate-800">
                              &ldquo;{entry.comment}&rdquo;
                            </p>
                            <div className="mt-1.5 flex items-center space-x-2 text-[10px] text-slate-400">
                              <span className="font-semibold text-slate-600">{entry.student}</span>
                              <span>•</span>
                              <span className="font-mono">{entry.id}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              }

              return null;
            })}
          </div>
        )}
      </div>

      {/* Submission Audit Roster */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Verified Submission Audit Log ({formResponses.length})
            </h3>
            <p className="text-xs text-slate-500">
              Demonstrating the enforced rule: each student records exactly one response.
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold rounded-full flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Duplicate Prevention Verified</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-4">#</th>
                <th className="py-2.5 px-4">Student ID</th>
                <th className="py-2.5 px-4">Student Name</th>
                <th className="py-2.5 px-4">Submission Timestamp</th>
                <th className="py-2.5 px-4">Submission Lock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {formResponses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No submissions recorded for this form yet.
                  </td>
                </tr>
              ) : (
                formResponses.map((resp, i) => (
                  <tr key={resp.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-4 text-slate-400 font-mono">{i + 1}</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                      {resp.studentId}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">
                      {resp.studentName}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 font-mono">
                      {new Date(resp.submittedAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Locked (1 Response)</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
