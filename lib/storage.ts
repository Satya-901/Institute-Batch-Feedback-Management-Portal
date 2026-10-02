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
} = {
  classes: [],
  batches: [],
  teachers: [],
  students: [],
  forms: [],
  responses: [],
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

export const saveClass = (cls: ClassItem) => {
  const index = clientStore.classes.findIndex((c) => c.id === cls.id);
  if (index >= 0) {
    clientStore.classes[index] = cls;
  } else {
    clientStore.classes.unshift(cls);
  }
  callSqlite('save_class', cls);
};

export const deleteClass = (id: string) => {
  clientStore.classes = clientStore.classes.filter((c) => c.id !== id);
  clientStore.batches = clientStore.batches.filter((b) => b.classId !== id);
  callSqlite('delete_class', { id });
};

// ---------------------------------------------------------------------------
// Batches Operations (Server SQLite)
// ---------------------------------------------------------------------------

export const getBatches = (): BatchItem[] => clientStore.batches;

export const saveBatch = (batch: BatchItem) => {
  const index = clientStore.batches.findIndex((b) => b.id === batch.id);
  if (index >= 0) {
    clientStore.batches[index] = batch;
  } else {
    clientStore.batches.unshift(batch);
  }
  callSqlite('save_batch', batch);
};

export const deleteBatch = (id: string) => {
  clientStore.batches = clientStore.batches.filter((b) => b.id !== id);
  callSqlite('delete_batch', { id });
};

// ---------------------------------------------------------------------------
// Teachers Operations (Server SQLite)
// ---------------------------------------------------------------------------

export const getTeachers = (): TeacherItem[] => clientStore.teachers;

export const saveTeacher = (teacher: TeacherItem) => {
  const index = clientStore.teachers.findIndex((t) => t.id === teacher.id);
  if (index >= 0) {
    clientStore.teachers[index] = teacher;
  } else {
    clientStore.teachers.unshift(teacher);
  }
  callSqlite('save_teacher', teacher);
};

export const deleteTeacher = (id: string) => {
  clientStore.teachers = clientStore.teachers.filter((t) => t.id !== id);
  callSqlite('delete_teacher', { id });
};

export const bulkAddTeachers = (
  newTeachers: TeacherItem[]
): { addedCount: number; duplicateCount: number } => {
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
    callSqlite('bulk_add_teachers', { teachers: validToAdd });
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

export const saveStudent = (student: StudentItem) => {
  const index = clientStore.students.findIndex(
    (s) => s.id === student.id || s.studentId === student.studentId
  );
  if (index >= 0) {
    clientStore.students[index] = student;
  } else {
    clientStore.students.unshift(student);
  }
  callSqlite('save_student', student);
};

export const bulkAddStudents = (
  newStudents: StudentItem[]
): { addedCount: number; duplicateCount: number } => {
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
    callSqlite('bulk_add_students', { students: validToAdd });
  }

  return { addedCount: validToAdd.length, duplicateCount: duplicates };
};

export const deleteStudent = (id: string) => {
  clientStore.students = clientStore.students.filter(
    (s) => s.id !== id && s.studentId !== id
  );
  callSqlite('delete_student', { id });
};

export const updateStudentPassword = (studentId: string, newPassword: string): boolean => {
  const index = clientStore.students.findIndex(
    (s) => s.studentId.toUpperCase() === studentId.trim().toUpperCase()
  );
  if (index >= 0) {
    clientStore.students[index].password = newPassword;
    clientStore.students[index].hasChangedPassword = true;
    callSqlite('update_student_password', { studentId, newPassword });
    return true;
  }
  return false;
};

// ---------------------------------------------------------------------------
// Feedback Forms Operations (Server SQLite)
// ---------------------------------------------------------------------------

export const getFeedbackForms = (): FeedbackForm[] => clientStore.forms;

export const saveFeedbackForm = (form: FeedbackForm) => {
  const index = clientStore.forms.findIndex((f) => f.id === form.id);
  if (index >= 0) {
    clientStore.forms[index] = form;
  } else {
    clientStore.forms.unshift(form);
  }
  callSqlite('save_form', form);
};

export const toggleFeedbackFormStatus = (id: string): 'active' | 'closed' => {
  const item = clientStore.forms.find((f) => f.id === id);
  if (item) {
    item.status = item.status === 'active' ? 'closed' : 'active';
    callSqlite('toggle_form_status', { id });
    return item.status;
  }
  return 'closed';
};

export const deleteFeedbackForm = (id: string) => {
  clientStore.forms = clientStore.forms.filter((f) => f.id !== id);
  callSqlite('delete_form', { id });
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

  clientStore.responses.unshift(newResponse);
  callSqlite('submit_response', newResponse);

  return {
    success: true,
    message: 'Feedback submitted successfully.',
    responseId: newResponse.id,
  };
};

export const clearAllData = () => {
  clientStore = {
    classes: [],
    batches: [],
    teachers: [],
    students: [],
    forms: [],
    responses: [],
  };
  callSqlite('clear_all_data', {});
};
