'use client';

import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  UserPlus,
  Users,
  Search,
  Trash2,
  KeyRound,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  LogIn,
  Filter,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { StudentItem, BatchItem, ClassItem, BulkStudentRow } from '@/types';
import { saveStudent, bulkAddStudents, deleteStudent } from '@/lib/storage';
import { toastSuccess, toastError, toastInfo, alertSuccess, confirmAction } from '@/lib/notification';

interface StudentsTabProps {
  students: StudentItem[];
  batches: BatchItem[];
  classes: ClassItem[];
  onDataChanged: () => void;
  onLoginAsStudent: (student: StudentItem) => void;
}

export const StudentsTab: React.FC<StudentsTabProps> = ({
  students,
  batches,
  classes,
  onDataChanged,
  onLoginAsStudent,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>('all');

  // Modals
  const [showSingleModal, setShowSingleModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Single student form
  const [singleId, setSingleId] = useState('');
  const [singleName, setSingleName] = useState('');
  const [singleDob, setSingleDob] = useState('2006-05-15');
  const [singleBatchId, setSingleBatchId] = useState('');

  // Bulk student form
  const [bulkBatchId, setBulkBatchId] = useState('');
  const [bulkRawText, setBulkRawText] = useState('');

  // Open single modal
  const handleOpenSingleModal = () => {
    setSingleId(`STU${Math.floor(100 + Math.random() * 900)}`);
    setSingleName('');
    setSingleDob('2006-05-15');
    setSingleBatchId(batches[0]?.id || '');
    setShowSingleModal(true);
  };

  // Open bulk modal
  const handleOpenBulkModal = () => {
    setBulkBatchId(batches[0]?.id || '');
    setBulkRawText('');
    setShowBulkModal(true);
  };

  // Sample bulk generator for 1-click test
  const handleLoadSampleBulkData = () => {
    const sample = [
      'STU-301, Manish Khandelwal, 2006-02-14',
      'STU-302, Sneha Mukherjee, 2006-09-20',
      'STU-303, Harshit Singhal, 2006-11-08',
      'STU-304, Ritika Choudhary, 2006-04-28',
      'STU-305, Mohammed Zaid, 2006-07-15',
    ].join('\n');
    setBulkRawText(sample);
    toastInfo('Sample 5 student records loaded into bulk editor');
  };

  // Parse bulk text in real-time
  const parsedBulkRows: BulkStudentRow[] = useMemo(() => {
    if (!bulkRawText.trim()) return [];

    const lines = bulkRawText.split('\n');
    const existingIds = new Set(students.map((s) => s.studentId.toUpperCase()));
    const seenInBulk = new Set<string>();

    return lines
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        // Support comma, tab, or semicolon separation
        const parts = line.split(/[,;\t]+/).map((p) => p.trim());
        const id = parts[0] || '';
        const name = parts[1] || '';
        const dob = parts[2] || '';

        if (!id || !name || !dob) {
          return {
            studentId: id,
            name: name,
            dob: dob,
            isValid: false,
            error: 'Missing Student ID, Name, or Date of Birth',
          };
        }

        const upperId = id.toUpperCase();
        if (existingIds.has(upperId)) {
          return {
            studentId: id,
            name,
            dob,
            isValid: false,
            error: `Student ID "${id}" is already registered`,
          };
        }

        if (seenInBulk.has(upperId)) {
          return {
            studentId: id,
            name,
            dob,
            isValid: false,
            error: `Duplicate ID in bulk list`,
          };
        }

        seenInBulk.add(upperId);

        return {
          studentId: upperId,
          name,
          dob,
          isValid: true,
        };
      });
  }, [bulkRawText, students]);

  const validBulkCount = parsedBulkRows.filter((r) => r.isValid).length;

  const handleSaveSingleStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleId.trim() || !singleName.trim() || !singleDob.trim()) {
      toastError('All fields (Student ID, Name, Date of Birth) are required');
      return;
    }
    if (!singleBatchId) {
      toastError('Please select a batch');
      return;
    }

    const cleanId = singleId.trim().toUpperCase();
    if (students.some((s) => s.studentId.toUpperCase() === cleanId)) {
      toastError(`Student ID "${cleanId}" already exists`);
      return;
    }

    const newStudent: StudentItem = {
      id: `stu-${Date.now()}`,
      studentId: cleanId,
      name: singleName.trim(),
      dob: singleDob.trim(),
      batchId: singleBatchId,
      createdAt: new Date().toISOString(),
    };

    saveStudent(newStudent);
    toastSuccess(`Student "${newStudent.name}" enrolled successfully`);
    setShowSingleModal(false);
    onDataChanged();
  };

  const handleExecuteBulkImport = async () => {
    if (!bulkBatchId) {
      toastError('Please select a target batch for enrolments');
      return;
    }

    const validRows = parsedBulkRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      toastError('No valid student rows found to import');
      return;
    }

    const targetBatch = batches.find((b) => b.id === bulkBatchId);

    const confirmed = await confirmAction({
      title: `Import ${validRows.length} Students?`,
      text: `These students will be registered in batch "${targetBatch?.name || 'Selected Batch'}" with their Date of Birth set as their default password.`,
      confirmButtonText: `Import ${validRows.length} Students`,
      cancelButtonText: 'Cancel',
      isDestructive: false,
    });

    if (confirmed) {
      const newItems: StudentItem[] = validRows.map((row) => ({
        id: `stu-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        studentId: row.studentId,
        name: row.name,
        dob: row.dob,
        batchId: bulkBatchId,
        createdAt: new Date().toISOString(),
      }));

      const result = bulkAddStudents(newItems);
      await alertSuccess(
        'Bulk Import Completed',
        `Successfully registered ${result.addedCount} students into ${targetBatch?.name}. Initial passwords have been configured to their respective Date of Birth.`
      );
      toastSuccess(`${result.addedCount} students enrolled`);
      setShowBulkModal(false);
      onDataChanged();
    }
  };

  const handleDeleteStudent = async (student: StudentItem) => {
    const confirmed = await confirmAction({
      title: `Delete Student "${student.name}"?`,
      text: `Student ID: ${student.studentId}. All recorded submissions for this student will remain archived.`,
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
      isDestructive: true,
    });

    if (confirmed) {
      deleteStudent(student.id);
      toastSuccess(`Student record removed`);
      onDataChanged();
    }
  };

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.studentId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBatch = selectedBatchFilter === 'all' || s.batchId === selectedBatchFilter;
      return matchesSearch && matchesBatch;
    });
  }, [students, searchTerm, selectedBatchFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Student Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Minimal records: Student ID, Name, and Date of Birth as initial password.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleOpenBulkModal}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Bulk Enrol</span>
          </button>
          <button
            onClick={handleOpenSingleModal}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by student ID or full name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={selectedBatchFilter}
            onChange={(e) => setSelectedBatchFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">All Batches ({students.length})</option>
            {batches.map((b) => {
              const bCount = students.filter((s) => s.batchId === b.id).length;
              return (
                <option key={b.id} value={b.id}>
                  {b.name} ({bCount})
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Assigned Batch & Class</th>
                <th className="py-3 px-4">Date of Birth (Default Pwd)</th>
                <th className="py-3 px-4">Password Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No students found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const batch = batches.find((b) => b.id === student.batchId);
                  const parentClass = classes.find((c) => c.id === batch?.classId);

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {student.studentId}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {student.name}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-800">
                          {batch?.name || 'Unassigned'}
                        </span>
                        {parentClass && (
                          <span className="block text-[11px] text-slate-400">
                            {parentClass.code}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {student.dob}
                      </td>
                      <td className="py-3 px-4">
                        {student.hasChangedPassword ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Updated by Student</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <KeyRound className="w-3 h-3 text-slate-400" />
                            <span>Default (DOB)</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => onLoginAsStudent(student)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold transition-colors"
                            title="Directly test Student Portal with this student account"
                          >
                            <LogIn className="w-3 h-3" />
                            <span>Login As</span>
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(student)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors"
                            title="Delete Student"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Single Student Modal */}
      {showSingleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <UserPlus className="w-4 h-4 text-teal-600" />
                <span>Enrol Individual Student</span>
              </h3>
              <button
                onClick={() => setShowSingleModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSingleStudent} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Student ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter student ID or roll number"
                  value={singleId}
                  onChange={(e) => setSingleId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg uppercase font-mono focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Student Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter student full name"
                  value={singleName}
                  onChange={(e) => setSingleName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  required
                  value={singleDob}
                  onChange={(e) => setSingleDob(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Student date of birth for institutional records.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assign to Batch *
                </label>
                <select
                  required
                  value={singleBatchId}
                  onChange={(e) => setSingleBatchId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  {batches.map((b) => {
                    const c = classes.find((cl) => cl.id === b.classId);
                    return (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.code ? `(${b.code})` : ''} - {c?.code || 'Class'}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSingleModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm"
                >
                  Save & Enrol
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Add Students Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <FileSpreadsheet className="w-5 h-5 text-amber-600" />
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Bulk Enrol Students</h3>
                    <p className="text-[11px] text-slate-500">
                      Format: Student ID, Student Name, Date of Birth (YYYY-MM-DD)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {/* Batch selection */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Target Batch for this Bulk Import *
                    </label>
                    <select
                      value={bulkBatchId}
                      onChange={(e) => setBulkBatchId(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
                    >
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} {b.code ? `(${b.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleLoadSampleBulkData}
                    className="self-end sm:self-auto inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold border border-amber-200 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Load 5 Sample Students</span>
                  </button>
                </div>

                {/* Paste Textarea */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Paste CSV or Tab-separated rows (1 student per line)
                  </label>
                  <textarea
                    rows={5}
                    value={bulkRawText}
                    onChange={(e) => setBulkRawText(e.target.value)}
                    placeholder="Paste CSV lines (StudentID, Name, DateOfBirth) or upload file above"
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Live Preview Parser Table */}
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                    <span>Parsed Preview & Validation ({parsedBulkRows.length} rows)</span>
                    <span className="text-emerald-700 font-bold">
                      {validBulkCount} Valid / {parsedBulkRows.length - validBulkCount} Errors
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-44 overflow-y-auto bg-slate-50">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-200/70 text-slate-700 sticky top-0 font-semibold">
                        <tr>
                          <th className="py-1.5 px-2.5">#</th>
                          <th className="py-1.5 px-2.5">Student ID</th>
                          <th className="py-1.5 px-2.5">Name</th>
                          <th className="py-1.5 px-2.5">DOB (Password)</th>
                          <th className="py-1.5 px-2.5">Validation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {parsedBulkRows.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-4 text-center text-slate-400">
                              Paste student rows above or click &quot;Load 5 Sample Students&quot; to test.
                            </td>
                          </tr>
                        ) : (
                          parsedBulkRows.map((row, index) => (
                            <tr key={index} className={row.isValid ? 'bg-white' : 'bg-red-50/50'}>
                              <td className="py-1.5 px-2.5 text-slate-400 font-mono">
                                {index + 1}
                              </td>
                              <td className="py-1.5 px-2.5 font-mono font-bold text-slate-800">
                                {row.studentId || '-'}
                              </td>
                              <td className="py-1.5 px-2.5 text-slate-800">{row.name || '-'}</td>
                              <td className="py-1.5 px-2.5 font-mono text-slate-600">
                                {row.dob || '-'}
                              </td>
                              <td className="py-1.5 px-2.5">
                                {row.isValid ? (
                                  <span className="inline-flex items-center space-x-1 text-emerald-700 font-semibold">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>Ready</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center space-x-1 text-red-600 font-medium">
                                    <AlertCircle className="w-3 h-3" />
                                    <span>{row.error}</span>
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4">
              <span className="text-xs text-slate-500">
                {validBulkCount} valid student(s) will be added to the batch.
              </span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={validBulkCount === 0}
                  onClick={handleExecuteBulkImport}
                  className="px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg shadow-sm transition-all"
                >
                  Import {validBulkCount} Students
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
