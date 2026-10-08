'use client';

import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  Users2,
  GraduationCap,
  Clock,
  MapPin,
  ClipboardList,
  FolderPlus,
  Calendar,
} from 'lucide-react';
import { ClassItem, BatchItem, TeacherItem, StudentItem } from '@/types';
import {
  saveClass,
  deleteClass,
  saveBatch,
  deleteBatch,
} from '@/lib/storage';
import { toastSuccess, toastError, confirmAction } from '@/lib/notification';

interface ClassesBatchesTabProps {
  classes: ClassItem[];
  batches: BatchItem[];
  teachers: TeacherItem[];
  students: StudentItem[];
  onDataChanged: () => void | Promise<any>;
  onOpenCreateFormForBatch: (batchId: string) => void;
}

export const ClassesBatchesTab: React.FC<ClassesBatchesTabProps> = ({
  classes,
  batches,
  teachers,
  students,
  onDataChanged,
  onOpenCreateFormForBatch,
}) => {
  // Modal states
  const [showClassModal, setShowClassModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedClassIdForBatch, setSelectedClassIdForBatch] = useState<string>('');

  // Class form fields
  const [className, setClassName] = useState('');
  const [classCode, setClassCode] = useState('');
  const [department, setDepartment] = useState('');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [classDesc, setClassDesc] = useState('');

  // Batch form fields
  const [batchClassId, setBatchClassId] = useState('');
  const [batchName, setBatchName] = useState('');
  const [batchCode, setBatchCode] = useState('');
  const [timing, setTiming] = useState('08:30 AM - 01:30 PM');
  const [roomNumber, setRoomNumber] = useState('');
  const [maxCapacity, setMaxCapacity] = useState(45);

  const handleOpenClassModal = () => {
    setClassName('');
    setClassCode('');
    setDepartment('Academic Wing');
    setAcademicYear('2026-2027');
    setClassDesc('');
    setShowClassModal(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim() || !classCode.trim()) {
      toastError('Please specify class name and code');
      return;
    }

    const newClass: ClassItem = {
      id: `cls-${Date.now()}`,
      name: className.trim(),
      code: classCode.trim().toUpperCase(),
      department: department.trim() || 'Academic Wing',
      academicYear: academicYear.trim(),
      description: classDesc.trim(),
      createdAt: new Date().toISOString(),
    };

    await saveClass(newClass);
    toastSuccess(`Class "${newClass.name}" added successfully`);
    setShowClassModal(false);
    await onDataChanged();
  };

  const handleDeleteClass = async (cls: ClassItem) => {
    const classBatches = batches.filter((b) => b.classId === cls.id);
    const confirmed = await confirmAction({
      title: `Delete Class "${cls.name}"?`,
      text: classBatches.length > 0 
        ? `Warning: This class currently contains ${classBatches.length} batch(es). Are you sure you want to delete it?`
        : 'This action will remove the class from the portal.',
      confirmButtonText: 'Yes, Delete Class',
      cancelButtonText: 'Cancel',
      isDestructive: true,
    });

    if (confirmed) {
      await deleteClass(cls.id);
      toastSuccess(`Class "${cls.name}" deleted`);
      await onDataChanged();
    }
  };

  const handleOpenBatchModal = (preselectedClassId?: string) => {
    setBatchClassId(preselectedClassId || classes[0]?.id || '');
    setBatchName('');
    setBatchCode('');
    setTiming('09:00 AM - 02:00 PM');
    setRoomNumber('Hall 201');
    setMaxCapacity(50);
    setShowBatchModal(true);
  };

  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchName.trim()) {
      toastError('Please enter a batch name');
      return;
    }
    if (!batchClassId) {
      toastError('Please select a parent class');
      return;
    }

    const newBatch: BatchItem = {
      id: `batch-${Date.now()}`,
      classId: batchClassId,
      name: batchName.trim(),
      code: batchCode.trim().toUpperCase() || undefined,
      timing: timing.trim(),
      roomNumber: roomNumber.trim(),
      maxCapacity: Number(maxCapacity) || 45,
      academicYear: '2026-2027',
      createdAt: new Date().toISOString(),
    };

    await saveBatch(newBatch);
    toastSuccess(`Batch "${newBatch.name}" created successfully`);
    setShowBatchModal(false);
    await onDataChanged();
  };

  const handleDeleteBatch = async (batch: BatchItem) => {
    const batchStudents = students.filter((s) => s.batchId === batch.id);
    const confirmed = await confirmAction({
      title: `Delete Batch "${batch.name}"?`,
      text: batchStudents.length > 0
        ? `Warning: ${batchStudents.length} student(s) are assigned to this batch. Confirm deletion?`
        : 'Are you sure you want to delete this batch?',
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
      isDestructive: true,
    });

    if (confirmed) {
      await deleteBatch(batch.id);
      toastSuccess(`Batch "${batch.name}" deleted`);
      await onDataChanged();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Classes & Batches</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Organize classes and configure multiple batches per class.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleOpenBatchModal()}
            disabled={classes.length === 0}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Batch</span>
          </button>
          <button
            onClick={handleOpenClassModal}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Add Class</span>
          </button>
        </div>
      </div>

      {/* Classes list with nested batches */}
      {classes.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-xs">
          <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No classes configured</p>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Create an academic class or course to organize student batches and evaluations.
          </p>
          <button
            onClick={handleOpenClassModal}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold"
          >
            Add Class
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {classes.map((cls) => {
            const classBatches = batches.filter((b) => b.classId === cls.id);
            const classStudentsCount = students.filter((s) =>
              classBatches.some((b) => b.id === s.batchId)
            ).length;

            return (
              <div
                key={cls.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
              >
                {/* Clean Class Header */}
                <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <span className="font-bold text-sm text-slate-100">{cls.name}</span>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-800 text-teal-300 border border-slate-700">
                      {cls.code}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleOpenBatchModal(cls.id)}
                      className="px-2.5 py-1 rounded bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium"
                    >
                      + Add Batch
                    </button>
                    <button
                      onClick={() => handleDeleteClass(cls)}
                      title="Delete Class"
                      className="p-1 text-slate-400 hover:text-red-400 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Batches Grid */}
                <div className="p-4 bg-slate-50/50">
                  {classBatches.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">
                      No batches in this class yet. Click &ldquo;+ Add Batch&rdquo; to create one.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {classBatches.map((batch) => {
                        const batchStudents = students.filter((s) => s.batchId === batch.id);
                        const assignedTeachers = teachers.filter((t) =>
                          t.assignedBatchIds.includes(batch.id)
                        );

                        return (
                          <div
                            key={batch.id}
                            className="bg-white rounded-lg border border-slate-200 p-3.5 flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="font-bold text-sm text-slate-800">{batch.name}</h4>
                                  {batch.code && (
                                    <span className="inline-block mt-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                                      Code: {batch.code}
                                    </span>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleDeleteBatch(batch)}
                                  className="text-slate-400 hover:text-red-600 p-0.5"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                                {batch.timing && <div>Timing: {batch.timing}</div>}
                                {batch.roomNumber && <div>Room: {batch.roomNumber}</div>}
                                <div>Students: <span className="font-semibold text-slate-700">{batchStudents.length}</span> / {batch.maxCapacity}</div>
                              </div>

                              {assignedTeachers.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                                  {assignedTeachers.map((t) => (
                                    <span
                                      key={t.id}
                                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600"
                                    >
                                      {t.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="mt-3 pt-2 border-t border-slate-100 flex justify-end">
                              <button
                                onClick={() => onOpenCreateFormForBatch(batch.id)}
                                className="text-xs font-semibold text-teal-700 hover:text-teal-800"
                              >
                                + Create Feedback
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Class Creation Modal */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <FolderPlus className="w-4 h-4 text-teal-600" />
                <span>Create New Academic Class</span>
              </h3>
              <button
                onClick={() => setShowClassModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveClass} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Class / Program Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter class or programme name"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Class Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter class code"
                    value={classCode}
                    onChange={(e) => setClassCode(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg uppercase focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Academic Year
                  </label>
                  <input
                    type="text"
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department / Wing
                </label>
                <input
                  type="text"
                  placeholder="Enter department or academic wing"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Enter brief description of syllabus or academic notes"
                  value={classDesc}
                  onChange={(e) => setClassDesc(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm"
                >
                  Save Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Creation Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <Plus className="w-4 h-4 text-teal-600" />
                <span>Create New Batch</span>
              </h3>
              <button
                onClick={() => setShowBatchModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBatch} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Parent Class *
                </label>
                <select
                  required
                  value={batchClassId}
                  onChange={(e) => setBatchClassId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Batch Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Batch A (Morning)"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Batch Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. N11-A"
                    value={batchCode}
                    onChange={(e) => setBatchCode(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono uppercase border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Timing / Shift
                  </label>
                  <input
                    type="text"
                    placeholder="Enter timing or shift hours"
                    value={timing}
                    onChange={(e) => setTiming(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Room / Hall
                  </label>
                  <input
                    type="text"
                    placeholder="Enter hall or room number"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Maximum Student Capacity
                </label>
                <input
                  type="number"
                  min={5}
                  max={200}
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm"
                >
                  Save Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
