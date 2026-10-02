'use client';

import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  Filter,
  Users,
  Award,
  Calendar,
  CheckCircle2,
  TrendingUp,
  FileSpreadsheet,
  MessageSquare,
  Sparkles,
  School,
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
  const [selectedFormId, setSelectedFormId] = useState<string>(forms[0]?.id || 'all');
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>('all');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');

  // Filtered responses based on Form, Teacher, and Class
  const filteredResponses = useMemo(() => {
    return responses.filter((r) => {
      if (selectedFormId !== 'all' && r.formId !== selectedFormId) return false;
      if (selectedTeacherFilter !== 'all' && r.teacherId !== selectedTeacherFilter) return false;
      if (selectedClassFilter !== 'all' && r.classId && r.classId !== selectedClassFilter) {
        return false;
      }
      return true;
    });
  }, [responses, selectedFormId, selectedTeacherFilter, selectedClassFilter]);

  // Active form object if specific form selected
  const activeForm = useMemo(() => {
    if (selectedFormId === 'all') return forms[0] || null;
    return forms.find((f) => f.id === selectedFormId) || forms[0] || null;
  }, [forms, selectedFormId]);

  // Metrics computation for each teacher
  const teacherStats = useMemo(() => {
    const map = new Map<
      string,
      {
        teacher: TeacherItem;
        responsesCount: number;
        totalScore: number;
        maxScore: number;
        studentScores: {
          studentId: string;
          studentName: string;
          score: number;
          maxScore: number;
          percentage: number;
          submittedAt: string;
        }[];
      }
    >();

    // Initialize all teachers
    teachers.forEach((t) => {
      map.set(t.id, {
        teacher: t,
        responsesCount: 0,
        totalScore: 0,
        maxScore: 0,
        studentScores: [],
      });
    });

    // Populate from responses
    filteredResponses.forEach((r) => {
      if (!r.teacherId) return;
      const stat = map.get(r.teacherId);
      if (stat) {
        // Calculate scores from response or dynamically from activeForm
        let respScore = Number(r.totalScore) || 0;
        let respMax = Number(r.maxPossibleScore) || 0;

        // Fallback calculation if not stored
        if (respMax === 0 && activeForm) {
          activeForm.questions.forEach((q) => {
            if (q.type === 'multiple_choice' && q.options) {
              const maxQ = Math.max(...q.options.map((o) => o.score || 0), 0);
              respMax += maxQ;
              const chosen = q.options.find(
                (o) => o.text === r.answers[q.id] || o.id === r.answers[q.id]
              );
              if (chosen) respScore += Number(chosen.score) || 0;
            }
          });
        }

        const percentage = respMax > 0 ? Number(((respScore / respMax) * 100).toFixed(1)) : 0;

        stat.responsesCount += 1;
        stat.totalScore += respScore;
        stat.maxScore += respMax;
        stat.studentScores.push({
          studentId: r.studentId,
          studentName: r.studentName,
          score: respScore,
          maxScore: respMax,
          percentage,
          submittedAt: r.submittedAt,
        });
      }
    });

    return Array.from(map.values()).filter((s) => s.responsesCount > 0 || selectedTeacherFilter === 'all');
  }, [teachers, filteredResponses, activeForm, selectedTeacherFilter]);

  // Overall metrics across all filtered responses
  const overallMetrics = useMemo(() => {
    let grandTotalScore = 0;
    let grandMaxScore = 0;

    filteredResponses.forEach((r) => {
      let s = Number(r.totalScore) || 0;
      let m = Number(r.maxPossibleScore) || 0;

      if (m === 0 && activeForm) {
        activeForm.questions.forEach((q) => {
          if (q.type === 'multiple_choice' && q.options) {
            m += Math.max(...q.options.map((o) => o.score || 0), 0);
            const chosen = q.options.find(
              (o) => o.text === r.answers[q.id] || o.id === r.answers[q.id]
            );
            if (chosen) s += Number(chosen.score) || 0;
          }
        });
      }

      grandTotalScore += s;
      grandMaxScore += m;
    });

    const averagePercentage =
      grandMaxScore > 0 ? Number(((grandTotalScore / grandMaxScore) * 100).toFixed(1)) : 0;

    const evaluatedTeachersCount = new Set(
      filteredResponses.map((r) => r.teacherId).filter(Boolean)
    ).size;

    return {
      totalSubmissions: filteredResponses.length,
      grandTotalScore,
      grandMaxScore,
      averagePercentage,
      evaluatedTeachersCount,
    };
  }, [filteredResponses, activeForm]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredResponses.length === 0) {
      toastSuccess('No responses to export');
      return;
    }

    const headers = [
      'Submission ID',
      'Student ID',
      'Student Name',
      'Class',
      'Batch',
      'Teacher Name',
      'Marks Obtained',
      'Max Marks',
      'Percentage (%)',
      'Date & Time',
    ];

    const rows = filteredResponses.map((r) => {
      const cls = classes.find((c) => c.id === r.classId);
      const bch = batches.find((b) => b.id === r.batchId);
      const tch = teachers.find((t) => t.id === r.teacherId);
      const score = Number(r.totalScore) || 0;
      const maxScore = Number(r.maxPossibleScore) || 0;
      const pct = maxScore > 0 ? ((score / maxScore) * 100).toFixed(1) : '0';

      return [
        r.id,
        r.studentId,
        `"${r.studentName}"`,
        `"${cls?.name || 'Class'}"`,
        `"${bch?.name || 'Batch'}"`,
        `"${tch?.name || 'Faculty'}"`,
        score,
        maxScore,
        `${pct}%`,
        `"${new Date(r.submittedAt).toLocaleString()}"`,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `EduPulse_Faculty_Evaluation_Report_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toastSuccess('Evaluation CSV report downloaded');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Faculty Evaluation & Scoring Reports</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Marks scored by each teacher, student-wise marks distribution, and average percentage.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Form Selector */}
          <div className="flex items-center space-x-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedFormId}
              onChange={(e) => setSelectedFormId(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 font-medium"
            >
              <option value="all">All Feedback Forms ({forms.length})</option>
              {forms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.title}
                </option>
              ))}
            </select>
          </div>

          {/* Teacher Filter */}
          <select
            value={selectedTeacherFilter}
            onChange={(e) => setSelectedTeacherFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 font-medium"
          >
            <option value="all">All Faculty Members ({teachers.length})</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Export & Print */}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Total Marks Awarded */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Marks Scored</span>
            <span className="p-1.5 rounded-lg bg-teal-50 text-teal-600">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900">{overallMetrics.grandTotalScore}</span>
            <span className="text-xs text-slate-400 font-mono">/ {overallMetrics.grandMaxScore}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Aggregated across all questions</p>
        </div>

        {/* Overall Average % */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Average Percentage</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-emerald-700">
              {overallMetrics.averagePercentage}%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Institute faculty benchmark</p>
        </div>

        {/* Total Student Submissions */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Student Responses</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900">{overallMetrics.totalSubmissions}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Unique faculty evaluations recorded</p>
        </div>

        {/* Evaluated Teachers */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Faculty Evaluated</span>
            <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <School className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900">{overallMetrics.evaluatedTeachersCount}</span>
            <span className="text-xs text-slate-400 font-mono">/ {teachers.length}</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Teachers with student feedback</p>
        </div>
      </div>

      {/* Teacher-Wise Scoring Leaderboard & Summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Faculty Score Summary</h3>
            <p className="text-xs text-slate-500">
              Marks scored by each teacher (total marks, max marks, and average percentage).
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
            {teacherStats.length} Faculty
          </span>
        </div>

        {teacherStats.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No evaluations recorded yet. Share feedback links or QR codes with students.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {teacherStats.map(({ teacher, responsesCount, totalScore, maxScore }) => {
              const pct = maxScore > 0 ? Number(((totalScore / maxScore) * 100).toFixed(1)) : 0;
              const avgMarksPerStudent =
                responsesCount > 0 ? (totalScore / responsesCount).toFixed(1) : '0';
              const maxMarksPerStudent =
                responsesCount > 0 ? (maxScore / responsesCount).toFixed(1) : '0';

              const badgeColor =
                pct >= 85
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : pct >= 70
                  ? 'bg-blue-50 text-blue-800 border-blue-300'
                  : pct >= 50
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-red-50 text-red-800 border-red-300';

              return (
                <div
                  key={teacher.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{teacher.name}</h4>
                        <p className="text-[11px] text-slate-500">
                          {teacher.subjectSpecialization.join(', ') || 'Faculty'}
                        </p>
                      </div>

                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${badgeColor}`}>
                        {pct}%
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">
                          Total Marks
                        </span>
                        <span className="font-bold text-slate-900 text-sm">
                          {totalScore} <span className="text-xs text-slate-400 font-normal">/ {maxScore}</span>
                        </span>
                      </div>

                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 block uppercase font-bold">
                          Avg per Student
                        </span>
                        <span className="font-bold text-teal-800 text-sm">
                          {avgMarksPerStudent} <span className="text-xs text-slate-400 font-normal">/ {maxMarksPerStudent}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Evaluated by: <strong className="text-slate-700">{responsesCount} students</strong></span>
                    <button
                      onClick={() => setSelectedTeacherFilter(teacher.id)}
                      className="text-teal-700 hover:underline font-semibold"
                    >
                      View Submissions →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Per-Student Evaluation Responses Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Student Submissions & Score Breakdown
            </h3>
            <p className="text-xs text-slate-500">
              Details of which student gave how many marks to which faculty member.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {filteredResponses.length} records
          </span>
        </div>

        {filteredResponses.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No responses matching the current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5">Student ID</th>
                  <th className="px-3 py-2.5">Student Name</th>
                  <th className="px-3 py-2.5">Faculty Evaluated</th>
                  <th className="px-3 py-2.5 text-center">Marks Given</th>
                  <th className="px-3 py-2.5 text-center">Score %</th>
                  <th className="px-3 py-2.5">Submitted At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredResponses.map((r) => {
                  const teacher = teachers.find((t) => t.id === r.teacherId);
                  const score = Number(r.totalScore) || 0;
                  const maxScore = Number(r.maxPossibleScore) || 0;
                  const pct = maxScore > 0 ? Number(((score / maxScore) * 100).toFixed(1)) : 0;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-2.5 font-mono font-bold text-teal-800 uppercase">
                        {r.studentId}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-800">{r.studentName}</td>
                      <td className="px-3 py-2.5 font-medium text-slate-700">
                        {teacher?.name || 'General Faculty'}
                      </td>
                      <td className="px-3 py-2.5 text-center font-bold text-slate-900">
                        {score} <span className="text-slate-400 font-normal">/ {maxScore}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            pct >= 85
                              ? 'bg-emerald-50 text-emerald-700'
                              : pct >= 70
                              ? 'bg-blue-50 text-blue-700'
                              : pct >= 50
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {pct}%
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-400 font-mono text-[11px]">
                        {new Date(r.submittedAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Question-Wise Performance Breakdown */}
      {activeForm && activeForm.questions.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">Question-Wise Analysis</h3>
            <p className="text-xs text-slate-500">
              Option distributions and average score for each question in &ldquo;{activeForm.title}&rdquo;.
            </p>
          </div>

          <div className="space-y-4">
            {activeForm.questions.map((q, idx) => {
              if (q.type === 'multiple_choice' && q.options) {
                // Count how many students chose each option
                const optionCounts = q.options.map((opt) => {
                  const count = filteredResponses.filter(
                    (r) => r.answers[q.id] === opt.text || r.answers[q.id] === opt.id
                  ).length;
                  return { ...opt, count };
                });

                const totalAnswersForQ = optionCounts.reduce((acc, curr) => acc + curr.count, 0);

                return (
                  <div key={q.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start space-x-2.5">
                        <span className="w-5 h-5 rounded bg-teal-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{q.text}</h4>
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                            Multiple Choice (4 Options)
                          </span>
                        </div>
                      </div>

                      <span className="text-xs font-mono text-slate-500">
                        {totalAnswersForQ} responses
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                      {optionCounts.map((opt, optIdx) => {
                        const pct =
                          totalAnswersForQ > 0
                            ? Math.round((opt.count / totalAnswersForQ) * 100)
                            : 0;

                        return (
                          <div
                            key={opt.id || optIdx}
                            className="bg-white p-3 rounded-lg border border-slate-200 space-y-1"
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-800 truncate" title={opt.text}>
                                {String.fromCharCode(65 + optIdx)}. {opt.text}
                              </span>
                              <span className="font-mono text-teal-700 font-bold">
                                {opt.score} pts
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                              <span>{opt.count} students</span>
                              <span className="font-bold">{pct}%</span>
                            </div>

                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-teal-600 h-1.5 rounded-full transition-all"
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

              // Text Question Comments list
              if (q.type === 'text') {
                const comments = filteredResponses
                  .map((r) => ({
                    studentId: r.studentId,
                    studentName: r.studentName,
                    text: r.answers[q.id] as string,
                    date: r.submittedAt,
                  }))
                  .filter((c) => c.text && c.text.trim().length > 0);

                return (
                  <div key={q.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-start space-x-2.5">
                      <span className="w-5 h-5 rounded bg-slate-300 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{q.text}</h4>
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                          Open Text Feedback ({comments.length} comments)
                        </span>
                      </div>
                    </div>

                    {comments.length === 0 ? (
                      <p className="text-xs text-slate-400 italic pl-7">No comments submitted yet.</p>
                    ) : (
                      <div className="pl-7 space-y-2 max-h-48 overflow-y-auto">
                        {comments.map((c, cIdx) => (
                          <div key={cIdx} className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs">
                            <p className="text-slate-800">{c.text}</p>
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              By {c.studentName} ({c.studentId}) • {new Date(c.date).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return null;
            })}
          </div>
        </div>
      )}
    </div>
  );
};
