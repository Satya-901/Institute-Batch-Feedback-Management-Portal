'use client';

import React, { useState } from 'react';
import {
  LayoutTemplate,
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Layers,
  ArrowLeft,
  Search,
  Sparkles,
  HelpCircle,
  Award,
} from 'lucide-react';
import { FormTemplate, FeedbackQuestion, QuestionType } from '@/types';
import { saveFormTemplate, deleteFormTemplate } from '@/lib/storage';
import { toastSuccess, toastError, confirmAction } from '@/lib/notification';

interface QuestionTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: FormTemplate[];
  onUseTemplateInForm: (template: FormTemplate) => void;
  onDataChanged: () => void;
}

export const QuestionTemplatesModal: React.FC<QuestionTemplatesModalProps> = ({
  isOpen,
  onClose,
  templates,
  onUseTemplateInForm,
  onDataChanged,
}) => {
  // Mode: list view vs builder view
  const [isBuilderOpen, setIsBuilderOpen] = useState<boolean>(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);

  // Template Builder Form fields
  const [templateName, setTemplateName] = useState<string>('');
  const [templateDescription, setTemplateDescription] = useState<string>('');
  const [builderQuestions, setBuilderQuestions] = useState<FeedbackQuestion[]>([]);

  if (!isOpen) return null;

  // Filter templates by search
  const filteredTemplates = templates.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q) ||
      t.questions.some((qu) => qu.text.toLowerCase().includes(q))
    );
  });

  // Open builder for creating a new template
  const handleOpenCreateNew = () => {
    setEditingTemplateId(null);
    setTemplateName('');
    setTemplateDescription('');
    setBuilderQuestions([
      {
        id: `q-${Date.now()}-1`,
        text: 'Concept clarity and explanation depth',
        type: 'multiple_choice',
        options: [
          { id: 'opt-1', text: 'Outstanding - Crystal clear', score: 10 },
          { id: 'opt-2', text: 'Good - Well explained', score: 8 },
          { id: 'opt-3', text: 'Average - Needs improvement', score: 5 },
          { id: 'opt-4', text: 'Poor - Difficult to understand', score: 2 },
        ],
        required: true,
      },
      {
        id: `q-${Date.now()}-2`,
        text: 'Problem-solving practice and doubt-clearing support',
        type: 'multiple_choice',
        options: [
          { id: 'opt-1', text: 'Excellent & patient with doubts', score: 10 },
          { id: 'opt-2', text: 'Regular problem-solving', score: 8 },
          { id: 'opt-3', text: 'Occasional doubts solved', score: 5 },
          { id: 'opt-4', text: 'Rarely entertains doubts', score: 2 },
        ],
        required: true,
      },
      {
        id: `q-${Date.now()}-3`,
        text: 'Any feedback or suggestions for faculty improvement',
        type: 'text',
        required: false,
      },
    ]);
    setIsBuilderOpen(true);
  };

  // Open builder for editing an existing template
  const handleOpenEdit = (template: FormTemplate) => {
    setEditingTemplateId(template.id);
    setTemplateName(template.name);
    setTemplateDescription(template.description || '');
    setBuilderQuestions(JSON.parse(JSON.stringify(template.questions || [])));
    setIsBuilderOpen(true);
  };

  // Close builder back to template list
  const handleCloseBuilder = () => {
    setIsBuilderOpen(false);
    setEditingTemplateId(null);
  };

  // Add question inside builder
  const handleAddQuestion = (type: QuestionType) => {
    const newQ: FeedbackQuestion = {
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      text: '',
      type,
      options:
        type === 'multiple_choice'
          ? [
              { id: 'opt-1', text: 'Outstanding', score: 10 },
              { id: 'opt-2', text: 'Good', score: 8 },
              { id: 'opt-3', text: 'Average', score: 5 },
              { id: 'opt-4', text: 'Poor', score: 2 },
            ]
          : undefined,
      required: true,
    };
    setBuilderQuestions((prev) => [...prev, newQ]);
  };

  const handleUpdateQuestion = (id: string, updates: Partial<FeedbackQuestion>) => {
    setBuilderQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  const handleDeleteQuestion = (id: string) => {
    if (builderQuestions.length <= 1) {
      toastError('A template must have at least one question');
      return;
    }
    setBuilderQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const handleUpdateOption = (
    questionId: string,
    optionIndex: number,
    field: 'text' | 'score',
    value: string | number
  ) => {
    setBuilderQuestions((prev) =>
      prev.map((q) => {
        if (q.id === questionId && q.options) {
          const nextOptions = [...q.options];
          if (field === 'score') {
            nextOptions[optionIndex] = {
              ...nextOptions[optionIndex],
              score: Number(value) || 0,
            };
          } else {
            nextOptions[optionIndex] = {
              ...nextOptions[optionIndex],
              text: String(value),
            };
          }
          return { ...q, options: nextOptions };
        }
        return q;
      })
    );
  };

  // Save template
  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) {
      toastError('Please enter a template name');
      return;
    }
    if (builderQuestions.length === 0) {
      toastError('Please add at least one question');
      return;
    }

    const emptyQ = builderQuestions.find((q) => !q.text.trim());
    if (emptyQ) {
      toastError('All questions must have question text filled');
      return;
    }

    // Validate 4 options for multiple choice
    for (const q of builderQuestions) {
      if (q.type === 'multiple_choice') {
        if (!q.options || q.options.length !== 4) {
          toastError(`Question "${q.text.slice(0, 30)}" must have exactly 4 options with scores`);
          return;
        }
        for (const opt of q.options) {
          if (!opt.text.trim()) {
            toastError('All 4 options must have text labels');
            return;
          }
        }
      }
    }

    const templateId = editingTemplateId || `tmpl-${Date.now()}`;
    const newTemplate: FormTemplate = {
      id: templateId,
      name: templateName.trim(),
      description: templateDescription.trim(),
      questions: builderQuestions.map((q) => ({
        ...q,
        teacherId: undefined, // Template questions are generic
      })),
      createdAt: new Date().toISOString(),
    };

    saveFormTemplate(newTemplate);
    toastSuccess(
      editingTemplateId
        ? `Template "${newTemplate.name}" updated!`
        : `Template "${newTemplate.name}" created!`
    );
    setIsBuilderOpen(false);
    setEditingTemplateId(null);
    onDataChanged();
  };

  // Delete template
  const handleDeleteTemplate = async (template: FormTemplate) => {
    const confirmed = await confirmAction({
      title: `Delete Template?`,
      text: `Are you sure you want to delete "${template.name}"? This cannot be undone.`,
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
      isDestructive: true,
    });

    if (confirmed) {
      deleteFormTemplate(template.id);
      toastSuccess(`Template deleted`);
      onDataChanged();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col justify-between">
        {/* ========================================================================= */}
        {/* 1. BUILDER VIEW: CREATE / EDIT TEMPLATE */}
        {/* ========================================================================= */}
        {isBuilderOpen ? (
          <form onSubmit={handleSaveTemplate} className="flex-1 flex flex-col overflow-hidden">
            <div className="overflow-y-auto pr-1 space-y-4 flex-1">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleCloseBuilder}
                    className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                    title="Back to Templates"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {editingTemplateId ? 'Edit Question Template' : 'Create Question Template'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Define reusable questions and scores. You can import this into any feedback form anytime.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Template Name & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. NEET Weekly Physics Evaluation"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Short description of what this template evaluates"
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                </div>
              </div>

              {/* Questions List Header */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Questions ({builderQuestions.length})
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Multiple Choice (with 4 scored options) or Text Box
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('multiple_choice')}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg border border-teal-200 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Multiple Choice (4 Options)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('text')}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Text Box</span>
                  </button>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-3.5">
                {builderQuestions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="w-6 h-6 rounded bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>

                      <div className="flex-1 space-y-1">
                        <input
                          type="text"
                          required
                          placeholder="Question or criterion statement..."
                          value={q.text}
                          onChange={(e) => handleUpdateQuestion(q.id, { text: e.target.value })}
                          className="w-full px-3 py-2 text-xs sm:text-sm font-medium border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                        />
                        <div className="flex items-center space-x-2">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                              q.type === 'multiple_choice'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {q.type === 'multiple_choice'
                              ? 'Multiple Choice (4 Options)'
                              : 'Text Box / Comments'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="text-slate-400 hover:text-red-500 p-1"
                        title="Delete Question"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Multiple Choice: 4 Options */}
                    {q.type === 'multiple_choice' && (
                      <div className="pl-8 space-y-2 pt-2 border-t border-slate-200/60">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-700">
                            4 Options & Marks (Scoring):
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Max Marks:{' '}
                            <strong className="text-teal-700">
                              {Math.max(...(q.options || []).map((o) => o.score || 0), 0)}
                            </strong>
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(q.options || []).map((opt, optIdx) => (
                            <div
                              key={opt.id || optIdx}
                              className="flex items-center space-x-2 bg-white p-2 rounded-lg border border-slate-200"
                            >
                              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                                {String.fromCharCode(65 + optIdx)}
                              </span>

                              <input
                                type="text"
                                required
                                value={opt.text}
                                onChange={(e) =>
                                  handleUpdateOption(q.id, optIdx, 'text', e.target.value)
                                }
                                placeholder={`Option ${optIdx + 1}`}
                                className="flex-1 px-2 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-teal-500"
                              />

                              <div className="flex items-center space-x-1 shrink-0">
                                <span className="text-[10px] text-slate-500 font-medium">Marks:</span>
                                <input
                                  type="number"
                                  required
                                  value={opt.score}
                                  onChange={(e) =>
                                    handleUpdateOption(q.id, optIdx, 'score', e.target.value)
                                  }
                                  className="w-14 px-1.5 py-1 text-xs font-bold text-teal-800 bg-teal-50/50 border border-teal-300 rounded text-center focus:ring-1 focus:ring-teal-500"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Text Box Preview */}
                    {q.type === 'text' && (
                      <div className="pl-8 pt-1">
                        <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-400 text-xs italic">
                          Students will be provided an open text box for comments and suggestions.
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-end pl-8 pt-1 border-t border-slate-200/50">
                      <label className="inline-flex items-center space-x-1.5 text-[11px] text-slate-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={q.required}
                          onChange={(e) =>
                            handleUpdateQuestion(q.id, { required: e.target.checked })
                          }
                          className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                        />
                        <span>Required Question</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Builder Footer Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4">
              <button
                type="button"
                onClick={handleCloseBuilder}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-xs"
              >
                {editingTemplateId ? 'Update Template' : 'Save as New Template'}
              </button>
            </div>
          </form>
        ) : (
          /* ========================================================================= */
          /* 2. LIST VIEW: TEMPLATES LIBRARY */
          /* ========================================================================= */
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="overflow-y-auto pr-1 space-y-4 flex-1">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
                    <LayoutTemplate className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      Question Templates Library ({templates.length})
                    </h3>
                    <p className="text-xs text-slate-500">
                      Save, edit, and import ready-made questions with scoring into feedback forms.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleOpenCreateNew}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Template</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search templates by title, description, or question keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/70 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500 text-slate-800"
                />
              </div>

              {/* Templates List */}
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                  <LayoutTemplate className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">No templates found</p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    {searchQuery
                      ? 'No templates match your search criteria.'
                      : 'Create your first question template to quickly reuse in future feedback forms.'}
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenCreateNew}
                    className="px-3.5 py-1.5 text-xs font-semibold bg-teal-600 text-white rounded-lg"
                  >
                    + Create First Template
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTemplates.map((template) => {
                    const isExpanded = expandedTemplateId === template.id;
                    const mcqCount = template.questions.filter(
                      (q) => q.type === 'multiple_choice'
                    ).length;
                    const textCount = template.questions.filter((q) => q.type === 'text').length;

                    return (
                      <div
                        key={template.id}
                        className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 shadow-2xs transition-all space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2 flex-wrap gap-1">
                              <h4 className="font-bold text-slate-900 text-sm">
                                {template.name}
                              </h4>
                              <span className="text-[11px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                                {template.questions.length} Questions
                              </span>
                            </div>

                            {template.description && (
                              <p className="text-xs text-slate-600">
                                {template.description}
                              </p>
                            )}

                            <div className="flex items-center space-x-3 text-[11px] text-slate-500 pt-1">
                              <span>• {mcqCount} Multiple Choice (4 Options)</span>
                              {textCount > 0 && <span>• {textCount} Text Box</span>}
                            </div>
                          </div>

                          {/* Template Action Buttons */}
                          <div className="flex items-center space-x-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                onUseTemplateInForm(template);
                                onClose();
                              }}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-xs transition-colors"
                              title="Create a new feedback form using this template"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Use in New Form</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEdit(template)}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                              title="Edit Template Questions"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteTemplate(template)}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
                              title="Delete Template"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Accordion Toggle: Preview Questions */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedTemplateId(isExpanded ? null : template.id)
                            }
                            className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-600 hover:text-teal-700 transition-colors"
                          >
                            <span>
                              {isExpanded ? 'Hide Questions Preview' : 'Preview Questions & Scoring'}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <span className="text-[10px] text-slate-400">
                            ID: {template.id}
                          </span>
                        </div>

                        {/* Expanded Questions Details */}
                        {isExpanded && (
                          <div className="bg-slate-50 rounded-xl p-3 space-y-2.5 border border-slate-200/80 animate-in fade-in">
                            {template.questions.map((q, qIdx) => (
                              <div
                                key={q.id || qIdx}
                                className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs space-y-1.5"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-slate-800">
                                    Q{qIdx + 1}. {q.text}
                                  </span>
                                  <span
                                    className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                      q.type === 'multiple_choice'
                                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                        : 'bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    {q.type === 'multiple_choice' ? '4 Options' : 'Text Box'}
                                  </span>
                                </div>

                                {q.type === 'multiple_choice' && q.options && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                                    {q.options.map((opt, oIdx) => (
                                      <div
                                        key={opt.id || oIdx}
                                        className="flex items-center justify-between bg-slate-50 px-2 py-1 rounded border border-slate-100 text-[11px]"
                                      >
                                        <span className="text-slate-600">
                                          {String.fromCharCode(65 + oIdx)}. {opt.text}
                                        </span>
                                        <span className="font-bold text-teal-700 shrink-0 ml-1">
                                          {opt.score} pts
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Bottom Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4">
              <span className="text-xs text-slate-500">
                Templates are stored safely in SQL & SQLite and available whenever you create a form.
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
