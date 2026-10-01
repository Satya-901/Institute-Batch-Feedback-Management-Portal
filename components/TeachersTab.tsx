'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { TeacherItem, BatchItem, ClassItem, FeedbackForm, FeedbackResponse } from '@/types';
import { saveTeacher, deleteTeacher } from '@/lib/storage';
import { toastSuccess, toastError, confirmAction } from '@/lib/notification';

interface TeachersTabProps {
  teachers: TeacherItem[];
  batches: BatchItem[];
  classes: ClassItem[];
  forms: FeedbackForm[];
  responses: FeedbackResponse[];
  onDataChanged: () => void;
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

  // Form state
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

  const handleSaveTeacher = (e: React.FormEvent) => {
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

    saveTeacher(teacherData);
    toastSuccess(
      editingTeacherId
        ? `Faculty details for "${teacherData.name}" updated`
        : `Faculty "${teacherData.name}" added to ${selectedBatchIds.length} batch(es)`
    );
    setShowModal(false);
    onDataChanged();
  };

  const handleDeleteTeacher = async (teacher: TeacherItem) => {
    const confirmed = await confirmAction({
      title: `Remove Faculty "${teacher.name}"?`,
      text: `This will remove the teacher from all ${teacher.assignedBatchIds.length} assigned batches.`,
      confirmButtonText: 'Yes, Remove Faculty',
      cancelButtonText: 'Cancel',
      isDestructive: true,
    });

    if (confirmed) {
      deleteTeacher(teacher.id);
      toastSuccess(`Faculty member removed`);
      onDataChanged();
    }
  };

  // Calculate teacher average feedback rating
  const getTeacherAvgRating = (teacherId: string) => {
    const teacherForms = forms.filter((f) => f.teacherId === teacherId);
    const formIds = new Set(teacherForms.map((f) => f.id));
    const teacherResponses = responses.filter((r) => formIds.has(r.formId));

    if (teacherResponses.length === 0) return null;

    let total = 0;
    let count = 0;
    teacherResponses.forEach((resp) => {
      Object.values(resp.answers).forEach((val) => {
        if (typeof val === 'number') {
          total += val;
          count++;
        }
      });
    });

    return count > 0 ? (total / count).toFixed(1) : null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Faculty Members</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage teachers and their multi-batch assignments.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Add Teacher</span>
        </button>
      </div>

      {/* Teachers Grid */}
      {teachers.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-xs">
          <Users2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No teachers registered yet</p>
          <p className="text-xs text-slate-500 mt-1 mb-4">Add a teacher and assign them to one or more batches.</p>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold"
          >
            Add Teacher
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teachers.map((teacher) => {
            const avgRating = getTeacherAvgRating(teacher.id);
            const teacherBatches = batches.filter((b) => teacher.assignedBatchIds.includes(b.id));

            return (
              <div
                key={teacher.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar with rating badge */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {teacher.employeeId}
                      </span>
                      <h3 className="font-bold text-slate-900 text-base mt-1">{teacher.name}</h3>
                    </div>

                    {avgRating ? (
                      <div className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        <span>{avgRating}</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
                        No reviews yet
                      </span>
                    )}
                  </div>

                  {/* Contact info */}
                  <div className="mt-3 space-y-1 text-xs text-slate-500">
                    <div className="flex items-center space-x-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{teacher.email}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{teacher.phone}</span>
                    </div>
                  </div>

                  {/* Subjects */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100">
                    <p className="text-[11px] font-semibold text-slate-600 mb-1 flex items-center space-x-1">
                      <BookOpen className="w-3 h-3 text-slate-400" />
                      <span>Specialization:</span>
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {teacher.subjectSpecialization.map((subj, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                        >
                          {subj}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Multi-Batch Assignments */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1.5">
                      <span className="flex items-center space-x-1">
                        <Layers className="w-3 h-3 text-teal-600" />
                        <span>Assigned Batches ({teacherBatches.length}):</span>
                      </span>
                    </div>

                    {teacherBatches.length === 0 ? (
                      <p className="text-[11px] text-amber-700 italic">No batches assigned yet</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {teacherBatches.map((b) => {
                          const parentClass = classes.find((c) => c.id === b.classId);
                          return (
                            <span
                              key={b.id}
                              className="text-[10px] px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 font-medium"
                            >
                              {b.name} {parentClass ? `(${parentClass.code})` : ''}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                  <button
                    onClick={() => handleOpenEditModal(teacher)}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                  >
                    Edit / Batches
                  </button>
                  <button
                    onClick={() => handleDeleteTeacher(teacher)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition-colors"
                    title="Delete Teacher"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
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
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <Users2 className="w-4 h-4 text-teal-600" />
                <span>{editingTeacherId ? 'Edit Faculty & Batches' : 'Register New Faculty Member'}</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTeacher} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Faculty Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Rajeshwar Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Employee ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. EMP-PHY-101"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg uppercase focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="faculty@institution.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subjects / Specialization (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Physics, Numerical Analysis, Lab Practicals"
                  value={subjectsInput}
                  onChange={(e) => setSubjectsInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* Multi-Batch Selection Section */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-800">
                    Assign to Batches (Can be in multiple batches)
                  </label>
                  <span className="text-[11px] text-teal-700 font-semibold">
                    {selectedBatchIds.length} Selected
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 max-h-48 overflow-y-auto space-y-3">
                  {classes.map((cls) => {
                    const classBatches = batches.filter((b) => b.classId === cls.id);
                    if (classBatches.length === 0) return null;

                    return (
                      <div key={cls.id} className="space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
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
                                <span>{b.name}</span>
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
    </div>
  );
};
