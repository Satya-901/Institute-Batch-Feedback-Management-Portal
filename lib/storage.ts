'use client';

import {
  ClassItem,
  BatchItem,
  TeacherItem,
  StudentItem,
  FeedbackForm,
  FeedbackResponse,
} from '@/types';

const STORAGE_KEYS = {
  CLASSES: 'edupulse_classes_v2',
  BATCHES: 'edupulse_batches_v2',
  TEACHERS: 'edupulse_teachers_v2',
  STUDENTS: 'edupulse_students_v2',
  FORMS: 'edupulse_forms_v2',
  RESPONSES: 'edupulse_responses_v2',
  ADMIN_LOGGED_IN: 'edupulse_admin_auth',
};

// Generic Helpers
const getParsed = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const setParsed = <T>(key: string, value: T): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
};

// Sync with SQLite backend
export async function syncFromSqlite(): Promise<{
  classes: ClassItem[];
  batches: BatchItem[];
  teachers: TeacherItem[];
  students: StudentItem[];
  forms: FeedbackForm[];
  responses: FeedbackResponse[];
}> {
  try {
    const res = await fetch('/api/db');
    if (res.ok) {
      const data = await res.json();
      setParsed(STORAGE_KEYS.CLASSES, data.classes || []);
      setParsed(STORAGE_KEYS.BATCHES, data.batches || []);
      setParsed(STORAGE_KEYS.TEACHERS, data.teachers || []);
      setParsed(STORAGE_KEYS.STUDENTS, data.students || []);
      setParsed(STORAGE_KEYS.FORMS, data.forms || []);
      setParsed(STORAGE_KEYS.RESPONSES, data.responses || []);
      return data;
    }
  } catch (err) {
    console.warn('Could not sync from SQLite API, using local state:', err);
  }
  return {
    classes: getClasses(),
    batches: getBatches(),
    teachers: getTeachers(),
    students: getStudents(),
    forms: getFeedbackForms(),
    responses: getResponses(),
  };
}

async function callSqlite(action: string, payload: any) {
  try {
    await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload }),
    });
  } catch (err) {
    console.warn('SQLite API call failed:', err);
  }
}

// Admin Authentication
export const isAdminLoggedIn = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEYS.ADMIN_LOGGED_IN) === 'true';
};

export const setAdminLoggedIn = (status: boolean) => {
  if (typeof window === 'undefined') return;
  if (status) {
    localStorage.setItem(STORAGE_KEYS.ADMIN_LOGGED_IN, 'true');
  } else {
    localStorage.removeItem(STORAGE_KEYS.ADMIN_LOGGED_IN);
  }
};

export const checkAdminCredentials = async (password: string): Promise<boolean> => {
  try {
    const res = await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'admin_login',
        payload: { username: 'admin', password },
      }),
    });
    if (res.ok) {
      setAdminLoggedIn(true);
      return true;
    }
  } catch {
    // Local fallback check
    if (password === 'admin' || password === 'admin123') {
      setAdminLoggedIn(true);
      return true;
    }
  }
  return false;
};

// Classes (NO DUMMY DATA: starts empty [])
export const getClasses = (): ClassItem[] => getParsed<ClassItem[]>(STORAGE_KEYS.CLASSES, []);
export const saveClass = (cls: ClassItem) => {
  const list = getClasses();
  const index = list.findIndex((c) => c.id === cls.id);
  if (index >= 0) {
    list[index] = cls;
  } else {
    list.unshift(cls);
  }
  setParsed(STORAGE_KEYS.CLASSES, list);
  callSqlite('save_class', cls);
};

export const deleteClass = (id: string) => {
  const list = getClasses().filter((c) => c.id !== id);
  setParsed(STORAGE_KEYS.CLASSES, list);
  const batches = getBatches().filter((b) => b.classId !== id);
  setParsed(STORAGE_KEYS.BATCHES, batches);
  callSqlite('delete_class', { id });
};

// Batches (NO DUMMY DATA: starts empty [])
export const getBatches = (): BatchItem[] => getParsed<BatchItem[]>(STORAGE_KEYS.BATCHES, []);
export const saveBatch = (batch: BatchItem) => {
  const list = getBatches();
  const index = list.findIndex((b) => b.id === batch.id);
  if (index >= 0) {
    list[index] = batch;
  } else {
    list.unshift(batch);
  }
  setParsed(STORAGE_KEYS.BATCHES, list);
  callSqlite('save_batch', batch);
};

export const deleteBatch = (id: string) => {
  const list = getBatches().filter((b) => b.id !== id);
  setParsed(STORAGE_KEYS.BATCHES, list);
  callSqlite('delete_batch', { id });
};

// Teachers (NO DUMMY DATA: starts empty [])
export const getTeachers = (): TeacherItem[] => getParsed<TeacherItem[]>(STORAGE_KEYS.TEACHERS, []);
export const saveTeacher = (teacher: TeacherItem) => {
  const list = getTeachers();
  const index = list.findIndex((t) => t.id === teacher.id);
  if (index >= 0) {
    list[index] = teacher;
  } else {
    list.unshift(teacher);
  }
  setParsed(STORAGE_KEYS.TEACHERS, list);
  callSqlite('save_teacher', teacher);
};

export const deleteTeacher = (id: string) => {
  const list = getTeachers().filter((t) => t.id !== id);
  setParsed(STORAGE_KEYS.TEACHERS, list);
  callSqlite('delete_teacher', { id });
};

// Students (NO DUMMY DATA: starts empty [])
export const getStudents = (): StudentItem[] => getParsed<StudentItem[]>(STORAGE_KEYS.STUDENTS, []);
export const saveStudent = (student: StudentItem) => {
  const list = getStudents();
  const index = list.findIndex((s) => s.id === student.id || s.studentId === student.studentId);
  if (index >= 0) {
    list[index] = student;
  } else {
    list.unshift(student);
  }
  setParsed(STORAGE_KEYS.STUDENTS, list);
  callSqlite('save_student', student);
};

export const bulkAddStudents = (
  newStudents: StudentItem[]
): { addedCount: number; duplicateCount: number } => {
  const current = getStudents();
  const existingIds = new Set(current.map((s) => s.studentId.trim().toUpperCase()));
  const validToAdd: StudentItem[] = [];
  let duplicates = 0;

  for (const s of newStudents) {
    const cleanId = s.studentId.trim().toUpperCase();
    if (existingIds.has(cleanId)) {
      duplicates++;
    } else {
      existingIds.add(cleanId);
      validToAdd.push({
        ...s,
        studentId: cleanId,
      });
    }
  }

  if (validToAdd.length > 0) {
    setParsed(STORAGE_KEYS.STUDENTS, [...validToAdd, ...current]);
    callSqlite('bulk_add_students', { students: validToAdd });
  }

  return { addedCount: validToAdd.length, duplicateCount: duplicates };
};

export const deleteStudent = (id: string) => {
  const list = getStudents().filter((s) => s.id !== id && s.studentId !== id);
  setParsed(STORAGE_KEYS.STUDENTS, list);
  callSqlite('delete_student', { id });
};

export const updateStudentPassword = (studentId: string, newPassword: string): boolean => {
  const list = getStudents();
  const index = list.findIndex((s) => s.studentId.toUpperCase() === studentId.trim().toUpperCase());
  if (index >= 0) {
    list[index].password = newPassword;
    list[index].hasChangedPassword = true;
    setParsed(STORAGE_KEYS.STUDENTS, list);
    callSqlite('update_student_password', { studentId, newPassword });
    return true;
  }
  return false;
};

// Feedback Forms (NO DUMMY DATA: starts empty [])
export const getFeedbackForms = (): FeedbackForm[] => getParsed<FeedbackForm[]>(STORAGE_KEYS.FORMS, []);
export const saveFeedbackForm = (form: FeedbackForm) => {
  const list = getFeedbackForms();
  const index = list.findIndex((f) => f.id === form.id);
  if (index >= 0) {
    list[index] = form;
  } else {
    list.unshift(form);
  }
  setParsed(STORAGE_KEYS.FORMS, list);
  callSqlite('save_form', form);
};

export const toggleFeedbackFormStatus = (id: string): 'active' | 'closed' => {
  const list = getFeedbackForms();
  const item = list.find((f) => f.id === id);
  if (item) {
    item.status = item.status === 'active' ? 'closed' : 'active';
    setParsed(STORAGE_KEYS.FORMS, list);
    callSqlite('toggle_form_status', { id });
    return item.status;
  }
  return 'closed';
};

export const deleteFeedbackForm = (id: string) => {
  const list = getFeedbackForms().filter((f) => f.id !== id);
  setParsed(STORAGE_KEYS.FORMS, list);
  callSqlite('delete_form', { id });
};

// Feedback Responses (NO DUMMY DATA: starts empty [])
export const getResponses = (): FeedbackResponse[] => getParsed<FeedbackResponse[]>(STORAGE_KEYS.RESPONSES, []);

export const hasStudentSubmitted = (formId: string, studentId: string, teacherId?: string): boolean => {
  const responses = getResponses();
  const cleanStudentId = studentId.trim().toUpperCase();
  if (teacherId) {
    return responses.some(
      (r) =>
        r.formId === formId &&
        r.studentId.toUpperCase() === cleanStudentId &&
        r.teacherId === teacherId
    );
  }
  return responses.some((r) => r.formId === formId && r.studentId.toUpperCase() === cleanStudentId);
};

export const getStudentResponse = (formId: string, studentId: string, teacherId?: string): FeedbackResponse | undefined => {
  const responses = getResponses();
  const cleanStudentId = studentId.trim().toUpperCase();
  if (teacherId) {
    return responses.find(
      (r) =>
        r.formId === formId &&
        r.studentId.toUpperCase() === cleanStudentId &&
        r.teacherId === teacherId
    );
  }
  return responses.find((r) => r.formId === formId && r.studentId.toUpperCase() === cleanStudentId);
};

export const submitFeedbackResponse = (
  response: Omit<FeedbackResponse, 'id' | 'submittedAt'>
): { success: boolean; message: string; responseId?: string } => {
  const cleanStudentId = response.studentId.trim().toUpperCase();
  if (hasStudentSubmitted(response.formId, cleanStudentId, response.teacherId)) {
    return {
      success: false,
      message: 'You have already submitted feedback for this faculty member.',
    };
  }

  const newResponse: FeedbackResponse = {
    ...response,
    id: `resp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    studentId: cleanStudentId,
    submittedAt: new Date().toISOString(),
  };

  const list = getResponses();
  list.unshift(newResponse);
  setParsed(STORAGE_KEYS.RESPONSES, list);
  callSqlite('submit_response', response);

  return {
    success: true,
    message: 'Feedback submitted successfully.',
    responseId: newResponse.id,
  };
};

export const clearAllData = () => {
  if (typeof window === 'undefined') return;
  setParsed(STORAGE_KEYS.CLASSES, []);
  setParsed(STORAGE_KEYS.BATCHES, []);
  setParsed(STORAGE_KEYS.TEACHERS, []);
  setParsed(STORAGE_KEYS.STUDENTS, []);
  setParsed(STORAGE_KEYS.FORMS, []);
  setParsed(STORAGE_KEYS.RESPONSES, []);
  callSqlite('clear_all_data', {});
};
