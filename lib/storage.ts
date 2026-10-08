'use client';

import {
  ClassItem,
  BatchItem,
  TeacherItem,
  StudentItem,
  FeedbackForm,
  FeedbackResponse,
  FormTemplate,
} from '@/types';

const STORAGE_KEYS = {
  ADMIN_LOGGED_IN: 'edupulse_admin_auth',
  STUDENT_LOCAL_PROFILE: 'edupulse_saved_student_profile',
};

// In-memory runtime cache for client performance (Zero database storage in browser localStorage)
let clientStore: {
  classes: ClassItem[];
  batches: BatchItem[];
  teachers: TeacherItem[];
  students: StudentItem[];
  forms: FeedbackForm[];
  responses: FeedbackResponse[];
  templates: FormTemplate[];
} = {
  classes: [],
  batches: [],
  teachers: [],
  students: [],
  forms: [],
  responses: [],
  templates: [],
};

// Wipe legacy database keys from browser localStorage if they exist
if (typeof window !== 'undefined') {
  try {
    [
      'edupulse_classes_v2',
      'edupulse_batches_v2',
      'edupulse_teachers_v2',
      'edupulse_students_v2',
      'edupulse_forms_v2',
      'edupulse_responses_v2',
    ].forEach((k) => localStorage.removeItem(k));
  } catch {
    // Ignore in non-browser environments
  }
}

/**
 * Synchronize client memory directly with the server SQLite database file
 */
export async function syncFromSqlite(): Promise<{
  classes: ClassItem[];
  batches: BatchItem[];
  teachers: TeacherItem[];
  students: StudentItem[];
  forms: FeedbackForm[];
  responses: FeedbackResponse[];
  templates: FormTemplate[];
}> {
  try {
    const res = await fetch(`/api/db?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (res.ok) {
      const data = await res.json();
      clientStore = {
        classes: data.classes || [],
        batches: data.batches || [],
        teachers: data.teachers || [],
        students: data.students || [],
        forms: data.forms || [],
        responses: data.responses || [],
        templates: data.templates || [],
      };
      return clientStore;
    }
  } catch (err) {
    console.warn('Could not sync from server SQLite API:', err);
  }
  return clientStore;
}

export const syncFromServer = syncFromSqlite;

async function callSqlite(action: string, payload: any) {
  try {
    const res = await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload }),
    });
    return await res.json();
  } catch (err) {
    console.warn('Server SQLite DB API call failed:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Admin Authentication (Session only in cookie & storage, NO passwords)
// ---------------------------------------------------------------------------

export const isAdminLoggedIn = (): boolean => {
  if (typeof window === 'undefined') return false;
  const localVal = localStorage.getItem(STORAGE_KEYS.ADMIN_LOGGED_IN) === 'true';
  const cookieVal =
    typeof document !== 'undefined' &&
    document.cookie.includes(`${STORAGE_KEYS.ADMIN_LOGGED_IN}=true`);
  return localVal || cookieVal;
};

export const setAdminLoggedIn = (status: boolean) => {
  if (typeof window === 'undefined') return;
  if (status) {
    localStorage.setItem(STORAGE_KEYS.ADMIN_LOGGED_IN, 'true');
    document.cookie = `${STORAGE_KEYS.ADMIN_LOGGED_IN}=true; path=/; max-age=2592000; SameSite=Lax`;
  } else {
    localStorage.removeItem(STORAGE_KEYS.ADMIN_LOGGED_IN);
    document.cookie = `${STORAGE_KEYS.ADMIN_LOGGED_IN}=; path=/; max-age=0; SameSite=Lax`;
  }
};

export const checkAdminCredentials = async (
  username: string,
  password: string
): Promise<boolean> => {
  const cleanUser = (username || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  try {
    const res = await fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'admin_login',
        payload: { username: cleanUser, password: cleanPass },
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        setAdminLoggedIn(true);
        return true;
      }
    }
  } catch (err) {
    console.warn('Backend admin login call failed:', err);
  }
  return false;
};

// ---------------------------------------------------------------------------
// Classes Operations (Server SQLite)
// ---------------------------------------------------------------------------

export const getClasses = (): ClassItem[] => clientStore.classes;

export const saveClass = async (cls: ClassItem): Promise<boolean> => {
  const index = clientStore.classes.findIndex((c) => c.id === cls.id);
  if (index >= 0) {
    clientStore.classes[index] = cls;
  } else {
    clientStore.classes.unshift(cls);
  }
  const res = await callSqlite('save_class', cls);
  return res?.success ?? true;
};

export const deleteClass = async (id: string): Promise<boolean> => {
  clientStore.classes = clientStore.classes.filter((c) => c.id !== id);
  clientStore.batches = clientStore.batches.filter((b) => b.classId !== id);
  clientStore.forms = clientStore.forms.filter((f) => f.classId !== id);
  const res = await callSqlite('delete_class', { id });
  return res?.success ?? true;
};

// ---------------------------------------------------------------------------
// Batches Operations (Server SQLite)
// ---------------------------------------------------------------------------

export const getBatches = (): BatchItem[] => clientStore.batches;

export const saveBatch = async (batch: BatchItem): Promise<boolean> => {
  const index = clientStore.batches.findIndex((b) => b.id === batch.id);
  if (index >= 0) {
    clientStore.batches[index] = batch;
  } else {
    clientStore.batches.unshift(batch);
  }
  const res = await callSqlite('save_batch', batch);
  return res?.success ?? true;
};

export const deleteBatch = async (id: string): Promise<boolean> => {
  clientStore.batches = clientStore.batches.filter((b) => b.id !== id);
  clientStore.students = clientStore.students.filter((s) => s.batchId !== id);
  clientStore.forms = clientStore.forms.filter((f) => f.batchId !== id);
  const res = await callSqlite('delete_batch', { id });
  return res?.success ?? true;
};

// ---------------------------------------------------------------------------
// Teachers Operations (Server SQLite)
// ---------------------------------------------------------------------------

export const getTeachers = (): TeacherItem[] => clientStore.teachers;

export const saveTeacher = async (teacher: TeacherItem): Promise<boolean> => {
  const index = clientStore.teachers.findIndex((t) => t.id === teacher.id);
  if (index >= 0) {
    clientStore.teachers[index] = teacher;
  } else {
    clientStore.teachers.unshift(teacher);
  }
  const res = await callSqlite('save_teacher', teacher);
  return res?.success ?? true;
};

export const deleteTeacher = async (id: string): Promise<boolean> => {
  clientStore.teachers = clientStore.teachers.filter((t) => t.id !== id);
  clientStore.responses = clientStore.responses.filter((r) => r.teacherId !== id);
  const res = await callSqlite('delete_teacher', { id });
  return res?.success ?? true;
};

export const bulkAddTeachers = async (
  newTeachers: TeacherItem[]
): Promise<{ addedCount: number; duplicateCount: number }> => {
  const existingIds = new Set(
    clientStore.teachers.map((t) =>
      t.employeeId ? t.employeeId.trim().toUpperCase() : t.name.trim().toUpperCase()
    )
  );
  const validToAdd: TeacherItem[] = [];
  let duplicates = 0;

  for (const t of newTeachers) {
    const key = t.employeeId ? t.employeeId.trim().toUpperCase() : t.name.trim().toUpperCase();
    if (existingIds.has(key)) {
      duplicates++;
    } else {
      existingIds.add(key);
      validToAdd.push(t);
    }
  }

  if (validToAdd.length > 0) {
    clientStore.teachers = [...validToAdd, ...clientStore.teachers];
    await callSqlite('bulk_add_teachers', { teachers: validToAdd });
  }

  return { addedCount: validToAdd.length, duplicateCount: duplicates };
};

// ---------------------------------------------------------------------------
// Student Session Profile (Student form convenience)
// ---------------------------------------------------------------------------

export interface SavedStudentProfile {
  studentId: string;
  name: string;
  classId: string;
  batchId: string;
}

export const getSavedStudentProfile = (): SavedStudentProfile | null => {
  if (typeof window === 'undefined') return null;
  try {
    const val = localStorage.getItem(STORAGE_KEYS.STUDENT_LOCAL_PROFILE);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
};

export const setSavedStudentProfile = (profile: SavedStudentProfile): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.STUDENT_LOCAL_PROFILE, JSON.stringify(profile));
  } catch {
    // Ignore error
  }
};

// ---------------------------------------------------------------------------
// Students Operations (Server SQLite)
// ---------------------------------------------------------------------------

export const getStudents = (): StudentItem[] => clientStore.students;

export const saveStudent = async (student: StudentItem): Promise<boolean> => {
  const index = clientStore.students.findIndex(
    (s) => s.id === student.id || s.studentId === student.studentId
  );
  if (index >= 0) {
    clientStore.students[index] = student;
  } else {
    clientStore.students.unshift(student);
  }
  const res = await callSqlite('save_student', student);
  return res?.success ?? true;
};

export const bulkAddStudents = async (
  newStudents: StudentItem[]
): Promise<{ addedCount: number; duplicateCount: number }> => {
  const existingIds = new Set(
    clientStore.students.map((s) => s.studentId.trim().toUpperCase())
  );
  const validToAdd: StudentItem[] = [];
  let duplicates = 0;

  for (const s of newStudents) {
    const cleanId = s.studentId.trim().toUpperCase();
    if (existingIds.has(cleanId)) {
      duplicates++;
    } else {
      existingIds.add(cleanId);
      validToAdd.push({ ...s, studentId: cleanId });
    }
  }

  if (validToAdd.length > 0) {
    clientStore.students = [...validToAdd, ...clientStore.students];
    await callSqlite('bulk_add_students', { students: validToAdd });
  }

  return { addedCount: validToAdd.length, duplicateCount: duplicates };
};

export const deleteStudent = async (id: string): Promise<boolean> => {
  clientStore.students = clientStore.students.filter(
    (s) => s.id !== id && s.studentId !== id
  );
  const res = await callSqlite('delete_student', { id });
  return res?.success ?? true;
};

export const updateStudentPassword = async (
  studentId: string,
  newPassword: string
): Promise<boolean> => {
  const index = clientStore.students.findIndex(
    (s) => s.studentId.toUpperCase() === studentId.trim().toUpperCase()
  );
  if (index >= 0) {
    clientStore.students[index].password = newPassword;
    clientStore.students[index].hasChangedPassword = true;
    await callSqlite('update_student_password', { studentId, newPassword });
    return true;
  }
  return false;
};

// ---------------------------------------------------------------------------
// Feedback Forms Operations (Server SQLite)
// ---------------------------------------------------------------------------

export const getFeedbackForms = (): FeedbackForm[] => clientStore.forms;

export const saveFeedbackForm = async (form: FeedbackForm): Promise<boolean> => {
  const index = clientStore.forms.findIndex((f) => f.id === form.id);
  if (index >= 0) {
    clientStore.forms[index] = form;
  } else {
    clientStore.forms.unshift(form);
  }
  const res = await callSqlite('save_form', form);
  return res?.success ?? true;
};

export const toggleFeedbackFormStatus = async (id: string): Promise<'active' | 'closed'> => {
  const item = clientStore.forms.find((f) => f.id === id);
  if (item) {
    item.status = item.status === 'active' ? 'closed' : 'active';
    await callSqlite('toggle_form_status', { id });
    return item.status;
  }
  return 'closed';
};

export const deleteFeedbackForm = async (id: string): Promise<boolean> => {
  clientStore.forms = clientStore.forms.filter((f) => f.id !== id);
  clientStore.responses = clientStore.responses.filter((r) => r.formId !== id);
  const res = await callSqlite('delete_form', { id });
  return res?.success ?? true;
};

// ---------------------------------------------------------------------------
// Feedback Responses Operations (Server SQLite)
// ---------------------------------------------------------------------------

export const getResponses = (): FeedbackResponse[] => clientStore.responses;

export const hasStudentSubmitted = (
  formId: string,
  studentId: string,
  teacherId?: string
): boolean => {
  const cleanStudentId = studentId.trim().toUpperCase();
  if (teacherId) {
    return clientStore.responses.some(
      (r) =>
        r.formId === formId &&
        r.studentId.toUpperCase() === cleanStudentId &&
        r.teacherId === teacherId
    );
  }
  return clientStore.responses.some(
    (r) => r.formId === formId && r.studentId.toUpperCase() === cleanStudentId
  );
};

export const getStudentResponse = (
  formId: string,
  studentId: string,
  teacherId?: string
): FeedbackResponse | undefined => {
  const cleanStudentId = studentId.trim().toUpperCase();
  if (teacherId) {
    return clientStore.responses.find(
      (r) =>
        r.formId === formId &&
        r.studentId.toUpperCase() === cleanStudentId &&
        r.teacherId === teacherId
    );
  }
  return clientStore.responses.find(
    (r) => r.formId === formId && r.studentId.toUpperCase() === cleanStudentId
  );
};

export const submitFeedbackResponse = async (
  response: Omit<FeedbackResponse, 'id' | 'submittedAt'>
): Promise<{ success: boolean; message: string; responseId?: string }> => {
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

  clientStore.responses.unshift(newResponse);
  const serverRes = await callSqlite('submit_response', newResponse);
  if (serverRes && serverRes.success === false) {
    return serverRes;
  }

  return {
    success: true,
    message: 'Feedback submitted successfully.',
    responseId: newResponse.id,
  };
};

// ---------------------------------------------------------------------------
// Form Template Operations (Question-only reusable templates)
// ---------------------------------------------------------------------------

export const getFormTemplates = (): FormTemplate[] => clientStore.templates || [];

export const saveFormTemplate = async (template: FormTemplate): Promise<boolean> => {
  const index = clientStore.templates.findIndex((t) => t.id === template.id);
  if (index >= 0) {
    clientStore.templates[index] = template;
  } else {
    clientStore.templates.unshift(template);
  }
  const res = await callSqlite('save_template', template);
  return res?.success ?? true;
};

export const deleteFormTemplate = async (id: string): Promise<boolean> => {
  clientStore.templates = clientStore.templates.filter((t) => t.id !== id);
  const res = await callSqlite('delete_template', { id });
  return res?.success ?? true;
};

export const clearAllData = async (): Promise<boolean> => {
  clientStore = {
    classes: [],
    batches: [],
    teachers: [],
    students: [],
    forms: [],
    responses: [],
    templates: [],
  };
  const res = await callSqlite('clear_all_data', {});
  return res?.success ?? true;
};
