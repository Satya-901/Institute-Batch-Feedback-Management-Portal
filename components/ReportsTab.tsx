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
  RotateCcw,
  Star,
  Eye,
  X,
  Layers,
  Calculator,
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
  // Default to 'all' so that all responses across all forms/classes are visible
  const [selectedFormId, setSelectedFormId] = useState<string>('all');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>('all');
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>('all');

  // Modal for inspecting an individual student's detailed response
  const [inspectResponse, setInspectResponse] = useState<FeedbackResponse | null>(null);

  // Available batches for selected class filter
  const availableBatchesForFilter = useMemo(() => {
    if (selectedClassFilter === 'all') return batches;
    return batches.filter((b) => b.classId === selectedClassFilter);
  }, [selectedClassFilter, batches]);

  // Filtered responses based on Form, Class, Batch, and Faculty
  const filteredResponses = useMemo(() => {
    return responses.filter((r) => {
      if (selectedFormId !== 'all' && r.formId !== selectedFormId) return false;
      if (selectedClassFilter !== 'all' && r.classId && r.classId !== selectedClassFilter) {
        return false;
      }
      if (selectedBatchFilter !== 'all' && r.batchId && r.batchId !== selectedBatchFilter) {
        return false;
      }
      if (selectedTeacherFilter !== 'all' && r.teacherId !== selectedTeacherFilter) {
        return false;
      }
      return true;
    });
  }, [responses, selectedFormId, selectedClassFilter, selectedBatchFilter, selectedTeacherFilter]);

  // Active form object if specific form selected, or first form for question analysis
  const activeForm = useMemo(() => {
    if (selectedFormId !== 'all') {
      return forms.find((f) => f.id === selectedFormId) || null;
    }
    // If responses belong to a specific form, pick the most frequent form
    if (filteredResponses.length > 0) {
      const topFormId = filteredResponses[0].formId;
      return forms.find((f) => f.id === topFormId) || forms[0] || null;
    }
    return forms[0] || null;
  }, [forms, selectedFormId, filteredResponses]);

  // Dynamic number of questions in active form (used as divisor instead of hardcoded 9)
  const activeQuestionCount = useMemo(() => {
    if (activeForm && activeForm.questions.length > 0) {
      return activeForm.questions.length;
    }
    return 9; // Fallback only if no questions exist
  }, [activeForm]);

  // Teacher-wise metrics with the requested formula:
  // 1. Total marks given by all students added together
  // 2. Divided by number of students who evaluated
  // 3. Divided by Number of Questions in the feedback form
  const teacherStats = useMemo(() => {
    const map = new Map<
      string,
      {
        teacher: TeacherItem;
        responsesCount: number;
        totalScore: number;
        maxScore: number;
        avgScorePerStudent: number;
        formulaRating: number;
        percentage: number;
        studentScores: {
          id: string;
          studentId: string;
          studentName: string;
          score: number;
          scoreDividedByQuestions: number;
          maxScore: number;
          submittedAt: string;
        }[];
      }
    >();

    // Initialize map with all teachers
    teachers.forEach((t) => {
      map.set(t.id, {
        teacher: t,
        responsesCount: 0,
        totalScore: 0,
        maxScore: 0,
        avgScorePerStudent: 0,
        formulaRating: 0,
        percentage: 0,
        studentScores: [],
      });
    });

    // Aggregate from filtered responses
    filteredResponses.forEach((r) => {
      if (!r.teacherId) return;
      const stat = map.get(r.teacherId);
      if (stat) {
        const respScore = Number(r.totalScore) || 0;
        const respMax = Number(r.maxPossibleScore) || 0;
        const respForm = forms.find((f) => f.id === r.formId) || activeForm;
        const qCount = Math.max(
          respForm?.questions?.length || Object.keys(r.answers || {}).length || activeQuestionCount,
          1
        );

        stat.responsesCount += 1;
        stat.totalScore += respScore;
        stat.maxScore += respMax;
        stat.studentScores.push({
          id: r.id,
          studentId: r.studentId,
          studentName: r.studentName,
          score: respScore,
          scoreDividedByQuestions: Number((respScore / qCount).toFixed(2)),
          maxScore: respMax,
          submittedAt: r.submittedAt,
        });
      }
    });

    // Compute averages and the formula: (Total Score ÷ Number of Students) ÷ Number of Questions
    const list = Array.from(map.values()).map((s) => {
      const avgScorePerStudent = s.responsesCount > 0 ? s.totalScore / s.responsesCount : 0;
      // FORMULA: Total marks added, divided by number of students, divided by Number of Questions
      const formulaRating = s.responsesCount > 0 ? avgScorePerStudent / activeQuestionCount : 0;
      const percentage = s.maxScore > 0 ? (s.totalScore / s.maxScore) * 100 : 0;

      return {
        ...s,
        avgScorePerStudent,
        formulaRating,
        percentage,
      };
    });

    // Sort by formula rating descending (highest score first)
    list.sort((a, b) => {
      if (b.responsesCount !== a.responsesCount) {
        // Teachers with responses first
        if (b.responsesCount === 0) return -1;
        if (a.responsesCount === 0) return 1;
      }
      return b.formulaRating - a.formulaRating;
    });

    return list.filter((s) => s.responsesCount > 0 || selectedTeacherFilter === 'all');
  }, [teachers, filteredResponses, selectedTeacherFilter, forms, activeForm, activeQuestionCount]);

  // Overall aggregate metrics across all filtered responses
  const overallMetrics = useMemo(() => {
    let grandTotalScore = 0;
    let grandMaxScore = 0;

    filteredResponses.forEach((r) => {
      grandTotalScore += Number(r.totalScore) || 0;
      grandMaxScore += Number(r.maxPossibleScore) || 0;
    });

    const totalSubmissions = filteredResponses.length;
    const avgScorePerStudent = totalSubmissions > 0 ? grandTotalScore / totalSubmissions : 0;

    // OVERALL FORMULA RATING: (Grand Total Score ÷ Total Submissions) ÷ Number of Questions
    const overallRating = totalSubmissions > 0 ? avgScorePerStudent / activeQuestionCount : 0;
    const overallPercentage =
      grandMaxScore > 0 ? Number(((grandTotalScore / grandMaxScore) * 100).toFixed(1)) : 0;

    const evaluatedTeachersCount = new Set(
      filteredResponses.map((r) => r.teacherId).filter(Boolean)
    ).size;

    return {
      totalSubmissions,
      grandTotalScore,
      grandMaxScore,
      avgScorePerStudent,
      overallRating,
      overallPercentage,
      evaluatedTeachersCount,
    };
  }, [filteredResponses, activeQuestionCount]);

  const hasActiveFilters =
    selectedFormId !== 'all' ||
    selectedClassFilter !== 'all' ||
    selectedBatchFilter !== 'all' ||
    selectedTeacherFilter !== 'all';

  const handleResetFilters = () => {
    setSelectedFormId('all');
    setSelectedClassFilter('all');
    setSelectedBatchFilter('all');
    setSelectedTeacherFilter('all');
    toastSuccess('All filters reset');
  };

  // Export comprehensive report to CSV with Question option counts and student answers included
  const handleExportCSV = () => {
    if (filteredResponses.length === 0) {
      toastSuccess('No responses to export');
      return;
    }

    const csvSections: string[] = [];

    // --- OVERVIEW HEADER ---
    csvSections.push(`"EduPulse Faculty Feedback Comprehensive Report"`);
    csvSections.push(`"Generated On:","${new Date().toLocaleString()}"`);
    csvSections.push(`"Feedback Form:","${activeForm ? activeForm.title : 'All Forms'}"`);
    csvSections.push(`"Total Number of Questions:","${activeQuestionCount}"`);
    csvSections.push(`"Formula Used:","(Total Marks / Number of Students) / ${activeQuestionCount} Questions"`);
    csvSections.push(`"Total Student Responses:","${filteredResponses.length}"`);
    csvSections.push(`"Overall Rating:","${overallMetrics.overallRating.toFixed(2)} / 10"`);
    csvSections.push('');

    // --- SECTION 1: QUESTION-WISE ANALYSIS & OPTION DISTRIBUTION ---
    if (activeForm && activeForm.questions.length > 0) {
      csvSections.push(`"=== SECTION 1: QUESTION-WISE ANALYSIS & OPTION DISTRIBUTION ==="`);
      csvSections.push(
        [
          '"Q#"',
          '"Question Text"',
          '"Question Type"',
          '"Option A Text"',
          '"Opt A Count"',
          '"Opt A %"',
          '"Option B Text"',
          '"Opt B Count"',
          '"Opt B %"',
          '"Option C Text"',
          '"Opt C Count"',
          '"Opt C %"',
          '"Option D Text"',
          '"Opt D Count"',
          '"Opt D %"',
          '"Total Answers"',
        ].join(',')
      );

      activeForm.questions.forEach((q, qIdx) => {
        if (q.type === 'multiple_choice' && q.options) {
          const optStats = q.options.map((opt) => {
            const count = filteredResponses.filter(
              (r) => r.answers[q.id] === opt.text || r.answers[q.id] === opt.id
            ).length;
            return { text: opt.text, count };
          });
          const totalQAnswers = optStats.reduce((sum, o) => sum + o.count, 0);

          const getOptData = (idx: number) => {
            if (idx < optStats.length) {
              const o = optStats[idx];
              const pct = totalQAnswers > 0 ? Math.round((o.count / totalQAnswers) * 100) : 0;
              return [`"${o.text.replace(/"/g, '""')}"`, o.count, `"${pct}%"`];
            }
            return ['"-"', 0, '"0%"'];
          };

          const row = [
            `"Q${qIdx + 1}"`,
            `"${q.text.replace(/"/g, '""')}"`,
            `"Multiple Choice"`,
            ...getOptData(0),
            ...getOptData(1),
            ...getOptData(2),
            ...getOptData(3),
            totalQAnswers,
          ];
          csvSections.push(row.join(','));
        } else if (q.type === 'text') {
          const commentsCount = filteredResponses.filter(
            (r) => (r.answers[q.id] as string)?.trim()
          ).length;
          csvSections.push(
            [
              `"Q${qIdx + 1}"`,
              `"${q.text.replace(/"/g, '""')}"`,
              `"Open Text"`,
              `"Text Feedback (${commentsCount} comments submitted)"`,
              commentsCount,
              '"N/A"',
              '"-"',
              0,
              '"0%"',
              '"-"',
              0,
              '"0%"',
              '"-"',
              0,
              '"0%"',
              commentsCount,
            ].join(',')
          );
        }
      });
      csvSections.push('');
    }

    // --- SECTION 2: FACULTY PERFORMANCE LEADERBOARD ---
    csvSections.push(`"=== SECTION 2: FACULTY PERFORMANCE LEADERBOARD ==="`);
    csvSections.push(
      [
        '"Rank"',
        '"Faculty Name"',
        '"Subject / Department"',
        '"Evaluated Students Count"',
        '"Total Marks Scored"',
        '"Max Possible Marks"',
        '"Avg Marks / Student"',
        `"Rating (Marks ÷ ${activeQuestionCount} Qs)"`,
        '"Performance Percentage (%)"',
      ].join(',')
    );

    teacherStats.forEach((tStat, idx) => {
      csvSections.push(
        [
          `"#${idx + 1}"`,
          `"${tStat.teacher.name.replace(/"/g, '""')}"`,
          `"${(tStat.teacher.subjectSpecialization || []).join('; ').replace(/"/g, '""')}"`,
          tStat.responsesCount,
          tStat.totalScore,
          tStat.maxScore,
          tStat.avgScorePerStudent.toFixed(1),
          tStat.formulaRating.toFixed(2),
          `"${tStat.percentage.toFixed(1)}%"`,
        ].join(',')
      );
    });
    csvSections.push('');

    // --- SECTION 3: STUDENT-WISE DETAILED EVALUATIONS & QUESTION ANSWERS ---
    csvSections.push(`"=== SECTION 3: STUDENT-WISE DETAILED EVALUATIONS & QUESTION ANSWERS ==="`);

    const activeQuestions = activeForm?.questions || [];
    const studentHeaders = [
      '"Submission ID"',
      '"Student Roll ID"',
      '"Student Name"',
      '"Class"',
      '"Batch"',
      '"Faculty Evaluated"',
      '"Marks Given"',
      `"Rating (Score ÷ ${activeQuestionCount} Qs)"`,
      '"Max Marks"',
      '"Score %"',
      '"Submission Date & Time"',
      ...activeQuestions.map((q, idx) => `"Q${idx + 1}: ${q.text.replace(/"/g, '""')}"`),
    ];
    csvSections.push(studentHeaders.join(','));

    filteredResponses.forEach((r) => {
      const cls = classes.find((c) => c.id === r.classId);
      const bch = batches.find((b) => b.id === r.batchId);
      const tch = teachers.find((t) => t.id === r.teacherId);
      const score = Number(r.totalScore) || 0;
      const respForm = forms.find((f) => f.id === r.formId) || activeForm;
      const qCount = Math.max(
        respForm?.questions?.length || Object.keys(r.answers || {}).length || activeQuestionCount,
        1
      );
      const scoreRating = (score / qCount).toFixed(2);
      const maxScore = Number(r.maxPossibleScore) || 0;
      const pct = maxScore > 0 ? ((score / maxScore) * 100).toFixed(1) : '0';

      const questionAnswerCols = activeQuestions.map((q) => {
        const ans = r.answers[q.id];
        if (ans === undefined || ans === null || ans === '') {
          return '"-"';
        }
        return `"${String(ans).replace(/"/g, '""')}"`;
      });

      const row = [
        r.id,
        `"${r.studentId}"`,
        `"${(r.studentName || '').replace(/"/g, '""')}"`,
        `"${(cls?.name || 'Class').replace(/"/g, '""')}"`,
        `"${(bch?.name || 'Batch').replace(/"/g, '""')}"`,
        `"${(tch?.name || 'Faculty').replace(/"/g, '""')}"`,
        score,
        scoreRating,
        maxScore,
        `"${pct}%"`,
        `"${new Date(r.submittedAt).toLocaleString()}"`,
        ...questionAnswerCols,
      ];
      csvSections.push(row.join(','));
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' + encodeURIComponent(csvSections.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute(
      'download',
      `EduPulse_Faculty_Feedback_Full_Report_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toastSuccess('Comprehensive feedback report with questions & option counts exported to CSV');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-slate-900">Faculty Evaluation & Performance Reports</h2>
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-teal-50 text-teal-700 border border-teal-200">
                <Calculator className="w-3 h-3 text-teal-600" />
                <span>Formula: (Total Marks ÷ Students) ÷ No. of Questions</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Teacher ratings calculated by adding student marks, dividing by number of respondents, and dividing by total questions ({activeQuestionCount} Qs).
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* 1. Form Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Feedback Form
            </label>
            <select
              value={selectedFormId}
              onChange={(e) => setSelectedFormId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Feedback Forms ({forms.length})</option>
              {forms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.title}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Class Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Academic Class
            </label>
            <select
              value={selectedClassFilter}
              onChange={(e) => {
                setSelectedClassFilter(e.target.value);
                setSelectedBatchFilter('all');
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Classes ({classes.length})</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Batch Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Batch
            </label>
            <select
              value={selectedBatchFilter}
              onChange={(e) => setSelectedBatchFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Batches ({availableBatchesForFilter.length})</option>
              {availableBatchesForFilter.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.code ? `(${b.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Teacher Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Faculty Member
            </label>
            <select
              value={selectedTeacherFilter}
              onChange={(e) => setSelectedTeacherFilter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">All Faculty ({teachers.length})</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500">
              Showing filtered results ({filteredResponses.length} submissions found)
            </span>
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center space-x-1 text-teal-700 hover:text-teal-800 font-bold hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All Filters</span>
            </button>
          </div>
        )}
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Card 1: Formula Rating (÷ No. of Questions) */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Average Rating (÷ {activeQuestionCount} Qs)</span>
            <span className="p-1.5 rounded-lg bg-teal-50 text-teal-600">
              <Star className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-2xl font-extrabold text-teal-700">
              {overallMetrics.overallRating > 0
                ? overallMetrics.overallRating.toFixed(2)
                : '0.00'}
            </span>
            <span className="text-xs text-slate-400 font-medium">/ 10</span>
          </div>
          <p className="text-[10px] text-teal-700 font-mono mt-1 font-semibold">
            (Total Marks ÷ Students) ÷ {activeQuestionCount} Qs
          </p>
        </div>

        {/* Card 2: Total Marks Awarded */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Marks Scored</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-2xl font-bold text-slate-900">{overallMetrics.grandTotalScore}</span>
            <span className="text-xs text-slate-400 font-mono">pts</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Avg: {overallMetrics.avgScorePerStudent.toFixed(1)} marks/student
          </p>
        </div>

        {/* Card 3: Total Student Submissions */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Responses</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-2xl font-bold text-slate-900">{overallMetrics.totalSubmissions}</span>
            <span className="text-xs text-slate-400">evaluations</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Across all filtered batches</p>
        </div>

        {/* Card 4: Evaluated Teachers */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Faculty Evaluated</span>
            <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <School className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-2xl font-bold text-slate-900">{overallMetrics.evaluatedTeachersCount}</span>
            <span className="text-xs text-slate-400 font-mono">/ {teachers.length} teachers</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Active faculty on roster</p>
        </div>
      </div>

      {/* Teacher-Wise Scoring Leaderboard & Summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Faculty Performance Leaderboard & Score Summary</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ranked by formula: <strong className="text-slate-700">(Total Marks ÷ Students) ÷ No. of Questions ({activeQuestionCount} Qs)</strong>
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
            {teacherStats.length} Faculty Members
          </span>
        </div>

        {teacherStats.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No evaluations recorded for the current filter selection.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teacherStats.map(
              ({
                teacher,
                responsesCount,
                totalScore,
                maxScore,
                avgScorePerStudent,
                formulaRating,
                percentage,
              }, idx) => {
                const ratingBadgeColor =
                  formulaRating >= 8.5
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : formulaRating >= 7.0
                    ? 'bg-blue-50 text-blue-800 border-blue-300'
                    : formulaRating >= 5.0
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-red-50 text-red-800 border-red-300';

                return (
                  <div
                    key={teacher.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-teal-300 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Header with Rank & Teacher Name */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start space-x-2.5">
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                              idx === 0 && responsesCount > 0
                                ? 'bg-amber-400 text-white'
                                : idx === 1 && responsesCount > 0
                                ? 'bg-slate-300 text-slate-800'
                                : idx === 2 && responsesCount > 0
                                ? 'bg-amber-600 text-white'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            #{idx + 1}
                          </span>
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm leading-tight">
                              {teacher.name}
                            </h4>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {teacher.subjectSpecialization.join(', ') || 'Faculty'}
                            </p>
                          </div>
                        </div>

                        {/* Rating Badge */}
                        <div className="text-right">
                          <div
                            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg font-mono font-bold text-xs border ${ratingBadgeColor}`}
                          >
                            <Star className="w-3.5 h-3.5 fill-current" />
                            <span>
                              {responsesCount > 0
                                ? formulaRating.toFixed(2)
                                : 'N/A'}
                            </span>
                          </div>
                          <span className="block text-[9px] text-slate-400 uppercase font-mono mt-0.5">
                            Score ÷ {activeQuestionCount} Qs
                          </span>
                        </div>
                      </div>

                      {/* Score Metrics Grid */}
                      <div className="mt-3.5 grid grid-cols-2 gap-2 text-xs">
                        {/* Total Marks */}
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-500 block uppercase font-bold">
                            Total Marks
                          </span>
                          <span className="font-extrabold text-slate-900 text-sm">
                            {totalScore}{' '}
                            <span className="text-[11px] text-slate-400 font-normal">
                              / {maxScore}
                            </span>
                          </span>
                        </div>

                        {/* Avg Marks Per Student */}
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                          <span className="text-[10px] text-slate-500 block uppercase font-bold">
                            Avg Marks / Student
                          </span>
                          <span className="font-extrabold text-teal-800 text-sm">
                            {responsesCount > 0 ? avgScorePerStudent.toFixed(1) : '0'}{' '}
                            <span className="text-[11px] text-slate-400 font-normal">pts</span>
                          </span>
                        </div>
                      </div>

                      {/* Formula display box */}
                      {responsesCount > 0 && (
                        <div className="mt-2.5 p-2 rounded-lg bg-teal-50/70 border border-teal-200/80 text-[11px] text-teal-900 font-mono">
                          <div className="flex items-center justify-between text-[10px] text-teal-700 font-bold uppercase">
                            <span>Formula Calculation:</span>
                            <span>÷ {activeQuestionCount} Qs</span>
                          </div>
                          <div className="mt-0.5 font-semibold">
                            ({totalScore} ÷ {responsesCount}) ÷ {activeQuestionCount} ={' '}
                            <strong className="text-teal-950 font-bold">
                              {formulaRating.toFixed(2)}
                            </strong>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span>
                        Evaluated by:{' '}
                        <strong className="text-slate-800 font-bold">
                          {responsesCount} students
                        </strong>
                      </span>
                      {responsesCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedTeacherFilter(teacher.id)}
                          className="text-teal-700 hover:text-teal-800 font-bold hover:underline cursor-pointer"
                        >
                          View Reviews →
                        </button>
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>

      {/* Student-Wise Submissions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Student Evaluation Responses</h3>
            <p className="text-xs text-slate-500">
              Individual student submissions showing marks awarded and the calculated score divided by total questions ({activeQuestionCount} Qs).
            </p>
          </div>
          <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
            {filteredResponses.length} Submissions Recorded
          </span>
        </div>

        {filteredResponses.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400">
            No feedback responses matching the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5">Student Roll ID</th>
                  <th className="px-3 py-2.5">Student Name</th>
                  <th className="px-3 py-2.5">Class / Batch</th>
                  <th className="px-3 py-2.5">Faculty Evaluated</th>
                  <th className="px-3 py-2.5 text-center">Marks Given</th>
                  <th className="px-3 py-2.5 text-center">Score ÷ {activeQuestionCount} Qs (Rating)</th>
                  <th className="px-3 py-2.5 text-center">Score %</th>
                  <th className="px-3 py-2.5">Submitted At</th>
                  <th className="px-3 py-2.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredResponses.map((r) => {
                  const teacher = teachers.find((t) => t.id === r.teacherId);
                  const cls = classes.find((c) => c.id === r.classId);
                  const bch = batches.find((b) => b.id === r.batchId);
                  const score = Number(r.totalScore) || 0;
                  const maxScore = Number(r.maxPossibleScore) || 0;
                  const respForm = forms.find((f) => f.id === r.formId) || activeForm;
                  const qCount = Math.max(
                    respForm?.questions?.length || Object.keys(r.answers || {}).length || activeQuestionCount,
                    1
                  );
                  const scoreDividedByQuestions = (score / qCount).toFixed(2);
                  const pct = maxScore > 0 ? Number(((score / maxScore) * 100).toFixed(1)) : 0;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-2.5 font-mono font-bold text-teal-800 uppercase">
                        {r.studentId}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-900">{r.studentName}</td>
                      <td className="px-3 py-2.5 text-slate-600">
                        <div className="font-medium text-slate-800">{cls?.name || 'Class'}</div>
                        <div className="text-[10px] text-slate-400">
                          {bch?.name || 'Direct Class'}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-800">
                        {teacher?.name || 'Faculty Member'}
                      </td>
                      <td className="px-3 py-2.5 text-center font-bold text-slate-900">
                        {score}{' '}
                        <span className="text-slate-400 font-normal">/ {maxScore}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono font-bold text-teal-700 bg-teal-50/40">
                        {scoreDividedByQuestions}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            pct >= 85
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : pct >= 70
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : pct >= 50
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {pct}%
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-400 font-mono text-[11px]">
                        {new Date(r.submittedAt).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => setInspectResponse(r)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-teal-600" />
                          <span>View</span>
                        </button>
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
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Question-Wise Detailed Analysis</h3>
              <p className="text-xs text-slate-500">
                Option distribution and student choices for &ldquo;{activeForm.title}&rdquo;.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              {activeForm.questions.length} Questions
            </span>
          </div>

          <div className="space-y-4">
            {activeForm.questions.map((q, idx) => {
              if (q.type === 'multiple_choice' && q.options) {
                const optionCounts = q.options.map((opt) => {
                  const count = filteredResponses.filter(
                    (r) => r.answers[q.id] === opt.text || r.answers[q.id] === opt.id
                  ).length;
                  return { ...opt, count };
                });

                const totalAnswersForQ = optionCounts.reduce((acc, curr) => acc + curr.count, 0);

                return (
                  <div
                    key={q.id}
                    className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start space-x-2.5">
                        <span className="w-5 h-5 rounded bg-teal-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{q.text}</h4>
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                            Multiple Choice (Scored)
                          </span>
                        </div>
                      </div>

                      <span className="text-xs font-mono text-slate-500 font-semibold">
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
                  <div
                    key={q.id}
                    className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3"
                  >
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
                          <div
                            key={cIdx}
                            className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs"
                          >
                            <p className="text-slate-800">{c.text}</p>
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              By {c.studentName} ({c.studentId}) •{' '}
                              {new Date(c.date).toLocaleDateString()}
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

      {/* Inspect Single Student Submission Modal */}
      {inspectResponse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col justify-between">
            <div className="overflow-y-auto pr-1 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Student Feedback Submission</h3>
                  <p className="text-xs text-slate-500">
                    Roll ID: <strong className="font-mono text-teal-800">{inspectResponse.studentId}</strong> • {inspectResponse.studentName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectResponse(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Score Highlight with Formula */}
              <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-teal-700 block">
                    Marks Awarded
                  </span>
                  <span className="text-lg font-black text-teal-900">
                    {inspectResponse.totalScore}{' '}
                    <span className="text-xs font-normal text-teal-600">
                      / {inspectResponse.maxPossibleScore}
                    </span>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-teal-700 block">
                    Score ÷ {activeQuestionCount} Qs (Rating)
                  </span>
                  <span className="text-lg font-mono font-black text-teal-900">
                    {(Number(inspectResponse.totalScore || 0) / activeQuestionCount).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Answers List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase">Question Responses:</h4>
                {activeForm?.questions.map((q, idx) => {
                  const answer = inspectResponse.answers[q.id];
                  return (
                    <div key={q.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                      <div className="text-[11px] font-bold text-slate-700">
                        {idx + 1}. {q.text}
                      </div>
                      <div className="font-semibold text-teal-900 pl-3 border-l-2 border-teal-500 mt-1">
                        {answer ? String(answer) : <span className="text-slate-400 italic">No answer provided</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end mt-4">
              <button
                type="button"
                onClick={() => setInspectResponse(null)}
                className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
