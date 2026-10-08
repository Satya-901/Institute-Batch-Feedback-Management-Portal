'use client';

import React, { useState, useMemo } from 'react';
import {
  Users2,
  UserPlus,
  Trash2,
  Mail,
  Phone,
  BookOpen,
  Layers,
  CheckSquare,
  Square,
  Star,
  CheckCircle,
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import {
  TeacherItem,
  BatchItem,
  ClassItem,
  FeedbackForm,
  FeedbackResponse,
  BulkTeacherRow,
} from '@/types';
import { saveTeacher, deleteTeacher, bulkAddTeachers } from '@/lib/storage';
import { toastSuccess, toastError, confirmAction } from '@/lib/notification';

interface TeachersTabProps {
  teachers: TeacherItem[];
  batches: BatchItem[];
  classes: ClassItem[];
  forms: FeedbackForm[];
  responses: FeedbackResponse[];
  onDataChanged: () => void | Promise<any>;
}

export const TeachersTab: React.FC<TeachersTabProps> = ({
  teachers,
  batches,
  classes,
  forms,
  responses,
  onDataChanged,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);

  // Bulk Upload Modal state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkRawText, setBulkRawText] = useState('');
  const [bulkAssignBatchCodes, setBulkAssignBatchCodes] = useState('');
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  // Single Form state
  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subjectsInput, setSubjectsInput] = useState('');
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);

  const handleOpenAddModal = () => {
    setEditingTeacherId(null);
    setName('');
    setEmployeeId(`EMP-${Math.floor(100 + Math.random() * 900)}`);
    setEmail('');
    setPhone('');
    setSubjectsInput('');
    setSelectedBatchIds([]);
    setShowModal(true);
  };

  const handleOpenEditModal = (teacher: TeacherItem) => {
    setEditingTeacherId(teacher.id);
    setName(teacher.name);
    setEmployeeId(teacher.employeeId);
    setEmail(teacher.email);
    setPhone(teacher.phone);
    setSubjectsInput(teacher.subjectSpecialization.join(', '));
    setSelectedBatchIds([...teacher.assignedBatchIds]);
    setShowModal(true);
  };

  const toggleBatchSelection = (batchId: string) => {
    if (selectedBatchIds.includes(batchId)) {
      setSelectedBatchIds(selectedBatchIds.filter((id) => id !== batchId));
    } else {
      setSelectedBatchIds([...selectedBatchIds, batchId]);
    }
  };

  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toastError('Please enter faculty name');
      return;
    }

    const cleanSubjects = subjectsInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const teacherData: TeacherItem = {
      id: editingTeacherId || `tch-${Date.now()}`,
      employeeId: employeeId.trim() || `EMP-${Date.now().toString().slice(-4)}`,
      name: name.trim(),
      email: email.trim() || `${name.toLowerCase().replace(/\s+/g, '.') || 'faculty'}@institution.edu`,
      phone: phone.trim() || '+91 98000 00000',
      subjectSpecialization: cleanSubjects.length > 0 ? cleanSubjects : ['General Academics'],
      assignedBatchIds: selectedBatchIds,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    await saveTeacher(teacherData);
    toastSuccess(editingTeacherId ? 'Faculty updated' : 'Faculty registered');
    setShowModal(false);
    await onDataChanged();
  };

  const handleDeleteTeacher = async (teacher: TeacherItem) => {
    const teacherResponses = responses.filter((r) => r.teacherId === teacher.id);
    const confirmed = await confirmAction({
      title: `Delete Faculty ${teacher.name}?`,
      text:
        teacherResponses.length > 0
          ? `This faculty member has ${teacherResponses.length} student evaluation(s) recorded. Deleting them will remove their evaluations permanently.`
          : 'Are you sure you want to remove this faculty member?',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
      isDestructive: true,
    });

    if (confirmed) {
      await deleteTeacher(teacher.id);
      toastSuccess('Faculty member deleted');
      await onDataChanged();
    }
  };

  // Resolve comma-separated batch codes or names to batch IDs
  const resolveBatchCodesToIds = (codesInput: string): string[] => {
    if (!codesInput) return [];
    const codes = codesInput
      .split(/[,;]+/)
      .map((c) => c.trim().toUpperCase())
      .filter((c) => c.length > 0);

    const matchedIds: string[] = [];
    for (const code of codes) {
      const found = batches.find(
        (b) =>
          (b.code && b.code.toUpperCase() === code) ||
          b.name.toUpperCase() === code ||
          b.id.toUpperCase() === code
      );
      if (found && !matchedIds.includes(found.id)) {
        matchedIds.push(found.id);
      }
    }
    return matchedIds;
  };

  // Bulk Upload Parsing
  const parsedBulkRows: BulkTeacherRow[] = useMemo(() => {
    if (!bulkRawText.trim()) return [];

    const lines = bulkRawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const existingEmployeeIds = new Set(
      teachers.map((t) => t.employeeId.trim().toUpperCase())
    );
    const seenInInput = new Set<string>();
    const modalBatchIds = resolveBatchCodesToIds(bulkAssignBatchCodes);

    return lines.map((line, idx) => {
      // Split by comma, tab, or semicolon with quote handling
      const parts: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if ((char === ',' || char === '\t' || char === ';') && !inQuotes) {
          parts.push(cur.trim());
          cur = '';
        } else {
          cur += char;
        }
      }
      parts.push(cur.trim());

      let empId = '';
      let teacherName = '';
      let teacherEmail = '';
      let teacherPhone = '';
      let subjects = '';
      let rowBatchCodes = '';

      if (parts.length >= 6) {
        empId = parts[0];
        teacherName = parts[1];
        teacherEmail = parts[2] || '';
        teacherPhone = parts[3] || '';
        subjects = parts[4] || 'General Academics';
        rowBatchCodes = parts[5] || '';
      } else if (parts.length >= 2) {
        // If first part looks like EMP ID
        if (/^[a-zA-Z0-9\-_]{3,15}$/.test(parts[0]) && !parts[0].includes(' ') && parts.length > 2) {
          empId = parts[0];
          teacherName = parts[1];
          teacherEmail = parts[2] || '';
          teacherPhone = parts[3] || '';
          subjects = parts[4] || 'General Academics';
          rowBatchCodes = parts[5] || '';
        } else {
          teacherName = parts[0];
          teacherEmail = parts[1] || '';
          teacherPhone = parts[2] || '';
          subjects = parts[3] || 'General Academics';
          empId = parts[4] || `EMP-${100 + idx}`;
          rowBatchCodes = parts[5] || '';
        }
      } else {
        teacherName = parts[0];
        empId = `EMP-${100 + idx}`;
        subjects = 'General Academics';
      }

      // Check header row
      if (
        teacherName.toLowerCase() === 'name' ||
        teacherName.toLowerCase() === 'faculty name' ||
        empId.toLowerCase() === 'employeeid' ||
        empId.toLowerCase() === 'employee id' ||
        empId.toLowerCase() === 'emp id'
      ) {
        return {
          employeeId: empId,
          name: teacherName,
          email: '',
          phone: '',
          subjects: '',
          batchCodes: '',
          assignedBatchIds: [],
          isValid: false,
          error: 'Header line skipped',
        };
      }

      if (!teacherName) {
        return {
          employeeId: empId,
          name: '',
          email: teacherEmail,
          phone: teacherPhone,
          subjects,
          batchCodes: '',
          assignedBatchIds: [],
          isValid: false,
          error: 'Missing faculty name',
        };
      }

      const cleanEmpId = empId ? empId.toUpperCase() : `EMP-${100 + idx}`;
      if (existingEmployeeIds.has(cleanEmpId)) {
        return {
          employeeId: cleanEmpId,
          name: teacherName,
          email: teacherEmail,
          phone: teacherPhone,
          subjects,
          batchCodes: rowBatchCodes,
          assignedBatchIds: [],
          isValid: false,
          error: `Duplicate Employee ID "${cleanEmpId}" already exists`,
        };
      }

      if (seenInInput.has(cleanEmpId)) {
        return {
          employeeId: cleanEmpId,
          name: teacherName,
          email: teacherEmail,
          phone: teacherPhone,
          subjects,
          batchCodes: rowBatchCodes,
          assignedBatchIds: [],
          isValid: false,
          error: 'Duplicate ID in current batch',
        };
      }

      seenInInput.add(cleanEmpId);

      const rowSpecificBatchIds = resolveBatchCodesToIds(rowBatchCodes);
      const combinedBatchIds = Array.from(new Set([...modalBatchIds, ...rowSpecificBatchIds]));

      return {
        employeeId: cleanEmpId,
        name: teacherName,
        email: teacherEmail || `${teacherName.toLowerCase().replace(/\s+/g, '.')}@institution.edu`,
        phone: teacherPhone || '+91 98000 00000',
        subjects: subjects || 'General Academics',
        batchCodes: [bulkAssignBatchCodes, rowBatchCodes].filter(Boolean).join(', '),
        assignedBatchIds: combinedBatchIds,
        isValid: true,
      };
    });
  }, [bulkRawText, bulkAssignBatchCodes, teachers, batches]);

  const validBulkRows = useMemo(() => {
    return parsedBulkRows.filter((r) => r.isValid);
  }, [parsedBulkRows]);

  const handleDownloadSampleCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        'Employee ID,Faculty Name,Email,Phone,Subject Specialization,Batch Codes',
        'EMP-101,Dr. Amit Verma,amit.verma@college.edu,+91 98765 43210,Physics,N11-A',
        'EMP-102,Prof. Sneha Roy,sneha.roy@college.edu,+91 98765 43211,Mathematics,"N11-A, N12-A"',
        'EMP-103,Dr. Rajesh Gupta,rajesh.gupta@college.edu,+91 98765 43212,Chemistry,N11-B',
        'EMP-104,Ms. Pooja Nair,pooja.nair@college.edu,+91 98765 43213,Biology,N12-B',
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'Faculty_Bulk_Upload_Sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setBulkRawText(text);
      }
    };
    reader.readAsText(file);
  };

  const handleCommitBulkTeachers = async () => {
    if (validBulkRows.length === 0) {
      toastError('No valid faculty records found to import');
      return;
    }

    setIsProcessingBulk(true);

    const teachersToAdd: TeacherItem[] = validBulkRows.map((r, idx) => ({
      id: `tch-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
      employeeId: r.employeeId,
      name: r.name,
      email: r.email,
      phone: r.phone,
      subjectSpecialization: r.subjects
        ? r.subjects.split(',').map((s) => s.trim()).filter(Boolean)
        : ['General Academics'],
      assignedBatchIds: r.assignedBatchIds || [],
      status: 'active',
      createdAt: new Date().toISOString(),
    }));

    const result = await bulkAddTeachers(teachersToAdd);
    setIsProcessingBulk(false);
    toastSuccess(
      `Successfully imported ${result.addedCount} faculty members! (${result.duplicateCount} duplicates skipped)`
    );

    setBulkRawText('');
    setBulkAssignBatchCodes('');
    setShowBulkModal(false);
    await onDataChanged();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Faculty Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Add individual teachers or bulk import your faculty roster from CSV/Excel.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowBulkModal(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-teal-600" />
            <span>Bulk Import Faculty</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Faculty</span>
          </button>
        </div>
      </div>

      {/* Teachers Grid */}
      {teachers.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-xs">
          <Users2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No faculty members registered</p>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Add faculty members individually or import your staff list in bulk via CSV.
          </p>
          <div className="flex items-center justify-center space-x-2">
            <button
              onClick={() => setShowBulkModal(true)}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300"
            >
              Bulk Import Faculty
            </button>
            <button
              onClick={handleOpenAddModal}
              className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold"
            >
              Add Single Faculty
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {teachers.map((teacher) => {
            const assignedBatches = batches.filter((b) =>
              teacher.assignedBatchIds.includes(b.id)
            );
            const teacherResponses = responses.filter((r) => r.teacherId === teacher.id);

            // Compute teacher average score
            let totalScore = 0;
            let maxScore = 0;
            teacherResponses.forEach((r) => {
              totalScore += Number(r.totalScore) || 0;
              maxScore += Number(r.maxPossibleScore) || 0;
            });
            const avgPct = maxScore > 0 ? ((totalScore / maxScore) * 100).toFixed(1) : null;

            return (
              <div
                key={teacher.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{teacher.name}</h3>
                      <span className="font-mono text-[11px] text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                        {teacher.employeeId}
                      </span>
                    </div>

                    {avgPct ? (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full font-bold text-xs">
                        {avgPct}%
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono">No Ratings</span>
                    )}
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    {teacher.email && (
                      <div className="flex items-center space-x-1.5 text-slate-500">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{teacher.email}</span>
                      </div>
                    )}
                    {teacher.phone && (
                      <div className="flex items-center space-x-1.5 text-slate-500">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{teacher.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1.5 text-slate-700 pt-1">
                      <BookOpen className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span className="font-medium truncate">
                        {teacher.subjectSpecialization.join(', ') || 'General Academics'}
                      </span>
                    </div>
                  </div>

                  {/* Assigned Batches */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                      Teaching Batches ({assignedBatches.length}):
                    </span>
                    {assignedBatches.length === 0 ? (
                      <span className="text-[11px] text-slate-400 italic">
                        Available across all batches
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {assignedBatches.map((b) => (
                          <span
                            key={b.id}
                            className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium"
                          >
                            {b.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Evaluations: <strong className="text-slate-800">{teacherResponses.length}</strong></span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleOpenEditModal(teacher)}
                      className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded text-xs font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTeacher(teacher)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded"
                      title="Delete Faculty"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Faculty Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-slate-900 text-base mb-1">
              {editingTeacherId ? 'Edit Faculty Details' : 'Register New Faculty'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter staff details and assign to classes/batches.
            </p>

            <form onSubmit={handleSaveTeacher} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter faculty full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    placeholder="Enter employee ID or code"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm font-mono border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    placeholder="Enter contact phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="Enter official email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subject Specialization (Comma separated)
                </label>
                <input
                  type="text"
                  placeholder="Enter teaching subjects, separated by commas"
                  value={subjectsInput}
                  onChange={(e) => setSubjectsInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Batches Assignment */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Assign to Batches:
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2.5 bg-slate-50">
                  {classes.map((cls) => {
                    const classBatches = batches.filter((b) => b.classId === cls.id);
                    if (classBatches.length === 0) return null;

                    return (
                      <div key={cls.id} className="space-y-1">
                        <div className="text-[11px] font-bold text-slate-500 uppercase">
                          {cls.name} ({cls.code})
                        </div>
                        <div className="space-y-1 pl-1">
                          {classBatches.map((b) => {
                            const isChecked = selectedBatchIds.includes(b.id);
                            return (
                              <button
                                type="button"
                                key={b.id}
                                onClick={() => toggleBatchSelection(b.id)}
                                className={`w-full text-left flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                  isChecked
                                    ? 'bg-teal-100 text-teal-900 border border-teal-300'
                                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                <span>{b.name} {b.code ? `(${b.code})` : ''}</span>
                                {isChecked ? (
                                  <CheckSquare className="w-4 h-4 text-teal-700 shrink-0" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-300 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm"
                >
                  {editingTeacherId ? 'Save Changes' : 'Register Faculty'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Faculty Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col justify-between">
            <div className="overflow-y-auto pr-1 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Bulk Import Faculty Roster</h3>
                  <p className="text-xs text-slate-500">
                    Paste lines or upload CSV. Format: EmployeeId, Name, Email, Phone, Subjects, BatchCodes
                  </p>
                </div>
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <div className="flex items-center space-x-2">
                  <label className="cursor-pointer inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 shadow-2xs">
                    <FileSpreadsheet className="w-4 h-4 text-teal-600" />
                    <span>Upload CSV File</span>
                    <input
                      type="file"
                      accept=".csv,.txt,.tsv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleDownloadSampleCSV}
                    className="inline-flex items-center space-x-1 text-teal-700 hover:underline font-semibold"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Sample CSV</span>
                  </button>
                </div>

                <span className="text-[11px] text-slate-500">
                  {validBulkRows.length} valid / {parsedBulkRows.length} total rows
                </span>
              </div>

              {/* Assign to Batches Input */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <Layers className="w-4 h-4 text-teal-600" />
                    <span>Assign to Batches (Optional):</span>
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Type comma-separated batch codes (e.g. N11-A, N12-A)
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="Enter batch codes with commas (e.g. N11-A, N12-A)"
                  value={bulkAssignBatchCodes}
                  onChange={(e) => setBulkAssignBatchCodes(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono uppercase border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />

                {/* Available Batches Pills for easy 1-click toggling */}
                {batches.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-500 font-semibold">Available Batches:</span>
                    {batches.map((b) => {
                      const codeDisplay = b.code || b.name;
                      const currentCodes = bulkAssignBatchCodes
                        .split(/[,;]+/)
                        .map((c) => c.trim().toUpperCase())
                        .filter(Boolean);
                      const isSelected = currentCodes.includes(codeDisplay.toUpperCase());

                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              const filtered = currentCodes.filter(
                                (c) => c !== codeDisplay.toUpperCase()
                              );
                              setBulkAssignBatchCodes(filtered.join(', '));
                            } else {
                              setBulkAssignBatchCodes(
                                [...currentCodes, codeDisplay].join(', ')
                              );
                            }
                          }}
                          className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-teal-600 text-white shadow-2xs'
                              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '}
                          {b.code ? `${b.code} (${b.name})` : b.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Paste Faculty Rows (One per line)
                </label>
                <textarea
                  rows={5}
                  value={bulkRawText}
                  onChange={(e) => setBulkRawText(e.target.value)}
                  placeholder="Paste CSV lines (EmployeeId, Name, Email, Phone, Subjects, BatchCodes) or upload CSV file above"
                  className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Preview Table */}
              {parsedBulkRows.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">Preview & Validation</span>
                    <span className="text-emerald-700 font-semibold font-mono">
                      ✓ {validBulkRows.length} Ready to Import
                    </span>
                  </div>

                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase font-semibold">
                        <tr>
                          <th className="px-3 py-1.5">Emp ID</th>
                          <th className="px-3 py-1.5">Name</th>
                          <th className="px-3 py-1.5">Email</th>
                          <th className="px-3 py-1.5">Subjects</th>
                          <th className="px-3 py-1.5">Assigned Batches</th>
                          <th className="px-3 py-1.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedBulkRows.map((row, idx) => (
                          <tr key={idx} className={row.isValid ? 'bg-white' : 'bg-red-50/50'}>
                            <td className="px-3 py-1.5 font-mono text-slate-700">{row.employeeId}</td>
                            <td className="px-3 py-1.5 font-medium text-slate-800">{row.name}</td>
                            <td className="px-3 py-1.5 text-slate-500">{row.email}</td>
                            <td className="px-3 py-1.5 text-slate-600">{row.subjects}</td>
                            <td className="px-3 py-1.5">
                              {row.assignedBatchIds && row.assignedBatchIds.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {row.assignedBatchIds.map((bid) => {
                                    const b = batches.find((x) => x.id === bid);
                                    return (
                                      <span
                                        key={bid}
                                        className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 text-[10px] font-mono font-semibold border border-teal-200"
                                      >
                                        {b?.code || b?.name || bid}
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">None</span>
                              )}
                            </td>
                            <td className="px-3 py-1.5">
                              {row.isValid ? (
                                <span className="inline-flex items-center space-x-1 text-emerald-700 text-[11px] font-semibold">
                                  <span>✓ Ready</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 text-red-600 text-[11px]">
                                  <span>✕ {row.error}</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleCommitBulkTeachers}
                disabled={validBulkRows.length === 0 || isProcessingBulk}
                className="inline-flex items-center space-x-1.5 px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                <CheckCircle className="w-4 h-4" />
                <span>
                  {isProcessingBulk ? 'Importing...' : `Import ${validBulkRows.length} Faculty`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
