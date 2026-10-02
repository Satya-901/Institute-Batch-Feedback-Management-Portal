import fs from 'fs';
import path from 'path';
import {
  ClassItem,
  BatchItem,
  TeacherItem,
  StudentItem,
  FeedbackForm,
  FeedbackResponse,
} from '@/types';

export interface ServerDatabase {
  classes: ClassItem[];
  batches: BatchItem[];
  teachers: TeacherItem[];
  students: StudentItem[];
  forms: FeedbackForm[];
  responses: FeedbackResponse[];
  admin: {
    username: string;
    password: string;
  };
  lastUpdated: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'server-database.json');

let memoryCache: ServerDatabase | null = null;
let lastReadTime = 0;

/**
 * Get the server database from the server-side JSON file (persisted on server disk)
 */
export async function getServerDatabase(): Promise<ServerDatabase> {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const stats = fs.statSync(DB_FILE);
      if (memoryCache && stats.mtimeMs <= lastReadTime) {
        return memoryCache;
      }
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as ServerDatabase;
      memoryCache = parsed;
      lastReadTime = stats.mtimeMs;
      return parsed;
    } catch (err) {
      console.error('Error reading server-database.json:', err);
      if (memoryCache) return memoryCache;
    }
  }

  // Default database structure
  const defaultDb: ServerDatabase = {
    classes: [],
    batches: [],
    teachers: [],
    students: [],
    forms: [],
    responses: [],
    admin: {
      username: 'admin',
      password: 'admin123',
    },
    lastUpdated: new Date().toISOString(),
  };

  writeServerDatabase(defaultDb);
  return defaultDb;
}

/**
 * Write updated database to server-database.json atomically
 */
export function writeServerDatabase(db: ServerDatabase): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    db.lastUpdated = new Date().toISOString();
    const jsonString = JSON.stringify(db, null, 2);
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, jsonString, 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
    memoryCache = db;
    lastReadTime = Date.now();
  } catch (err) {
    console.error('Failed to write server-database.json:', err);
    throw err;
  }
}

// ----------------------------------------------------
// Server-Side CRUD Operations
// ----------------------------------------------------

export async function serverSaveClass(cls: ClassItem): Promise<void> {
  const db = await getServerDatabase();
  const index = db.classes.findIndex((c) => c.id === cls.id);
  if (index >= 0) {
    db.classes[index] = cls;
  } else {
    db.classes.unshift(cls);
  }
  writeServerDatabase(db);
}

export async function serverDeleteClass(id: string): Promise<void> {
  const db = await getServerDatabase();
  db.classes = db.classes.filter((c) => c.id !== id);
  db.batches = db.batches.filter((b) => b.classId !== id);
  writeServerDatabase(db);
}

export async function serverSaveBatch(batch: BatchItem): Promise<void> {
  const db = await getServerDatabase();
  const index = db.batches.findIndex((b) => b.id === batch.id);
  if (index >= 0) {
    db.batches[index] = batch;
  } else {
    db.batches.unshift(batch);
  }
  writeServerDatabase(db);
}

export async function serverDeleteBatch(id: string): Promise<void> {
  const db = await getServerDatabase();
  db.batches = db.batches.filter((b) => b.id !== id);
  writeServerDatabase(db);
}

export async function serverSaveTeacher(teacher: TeacherItem): Promise<void> {
  const db = await getServerDatabase();
  const index = db.teachers.findIndex((t) => t.id === teacher.id);
  if (index >= 0) {
    db.teachers[index] = teacher;
  } else {
    db.teachers.unshift(teacher);
  }
  writeServerDatabase(db);
}

export async function serverDeleteTeacher(id: string): Promise<void> {
  const db = await getServerDatabase();
  db.teachers = db.teachers.filter((t) => t.id !== id);
  writeServerDatabase(db);
}

export async function serverBulkAddTeachers(teachers: TeacherItem[]): Promise<{ addedCount: number; duplicateCount: number }> {
  const db = await getServerDatabase();
  const existingKeys = new Set(
    db.teachers.map((t) => (t.employeeId ? t.employeeId.trim().toUpperCase() : t.name.trim().toUpperCase()))
  );

  const toAdd: TeacherItem[] = [];
  let duplicates = 0;

  for (const t of teachers) {
    const key = t.employeeId ? t.employeeId.trim().toUpperCase() : t.name.trim().toUpperCase();
    if (existingKeys.has(key)) {
      duplicates++;
    } else {
      existingKeys.add(key);
      toAdd.push(t);
    }
  }

  if (toAdd.length > 0) {
    db.teachers = [...toAdd, ...db.teachers];
    writeServerDatabase(db);
  }

  return { addedCount: toAdd.length, duplicateCount: duplicates };
}

export async function serverSaveStudent(student: StudentItem): Promise<void> {
  const db = await getServerDatabase();
  const cleanId = student.studentId.trim().toUpperCase();
  const index = db.students.findIndex((s) => s.id === student.id || s.studentId.toUpperCase() === cleanId);
  const updatedStudent = { ...student, studentId: cleanId };
  if (index >= 0) {
    db.students[index] = updatedStudent;
  } else {
    db.students.unshift(updatedStudent);
  }
  writeServerDatabase(db);
}

export async function serverBulkAddStudents(students: StudentItem[]): Promise<{ addedCount: number; duplicateCount: number }> {
  const db = await getServerDatabase();
  const existingIds = new Set(db.students.map((s) => s.studentId.trim().toUpperCase()));
  const toAdd: StudentItem[] = [];
  let duplicates = 0;

  for (const s of students) {
    const upperId = s.studentId.trim().toUpperCase();
    if (existingIds.has(upperId)) {
      duplicates++;
    } else {
      existingIds.add(upperId);
      toAdd.push({ ...s, studentId: upperId });
    }
  }

  if (toAdd.length > 0) {
    db.students = [...toAdd, ...db.students];
    writeServerDatabase(db);
  }

  return { addedCount: toAdd.length, duplicateCount: duplicates };
}

export async function serverDeleteStudent(id: string): Promise<void> {
  const db = await getServerDatabase();
  const clean = id.trim().toUpperCase();
  db.students = db.students.filter((s) => s.id !== id && s.studentId.toUpperCase() !== clean);
  writeServerDatabase(db);
}

export async function serverUpdateStudentPassword(studentId: string, newPassword: string): Promise<boolean> {
  const db = await getServerDatabase();
  const clean = studentId.trim().toUpperCase();
  const index = db.students.findIndex((s) => s.studentId.toUpperCase() === clean);
  if (index >= 0) {
    db.students[index].password = newPassword;
    db.students[index].hasChangedPassword = true;
    writeServerDatabase(db);
    return true;
  }
  return false;
}

export async function serverSaveFeedbackForm(form: FeedbackForm): Promise<void> {
  const db = await getServerDatabase();
  const index = db.forms.findIndex((f) => f.id === form.id);
  if (index >= 0) {
    db.forms[index] = form;
  } else {
    db.forms.unshift(form);
  }
  writeServerDatabase(db);
}

export async function serverToggleFeedbackFormStatus(id: string): Promise<'active' | 'closed'> {
  const db = await getServerDatabase();
  const form = db.forms.find((f) => f.id === id);
  if (form) {
    form.status = form.status === 'active' ? 'closed' : 'active';
    writeServerDatabase(db);
    return form.status;
  }
  return 'closed';
}

export async function serverDeleteFeedbackForm(id: string): Promise<void> {
  const db = await getServerDatabase();
  db.forms = db.forms.filter((f) => f.id !== id);
  db.responses = db.responses.filter((r) => r.formId !== id);
  writeServerDatabase(db);
}

export async function serverSubmitFeedbackResponse(
  response: Omit<FeedbackResponse, 'id' | 'submittedAt'> & { id?: string; submittedAt?: string }
): Promise<{ success: boolean; message: string; responseId?: string }> {
  const db = await getServerDatabase();
  const cleanStudentId = response.studentId.trim().toUpperCase();
  const safeTeacherId = response.teacherId || '';

  const alreadySubmitted = safeTeacherId
    ? db.responses.some(
        (r) =>
          r.formId === response.formId &&
          r.studentId.toUpperCase() === cleanStudentId &&
          r.teacherId === safeTeacherId
      )
    : db.responses.some(
        (r) => r.formId === response.formId && r.studentId.toUpperCase() === cleanStudentId
      );

  if (alreadySubmitted) {
    return {
      success: false,
      message: 'You have already submitted feedback for this faculty member.',
    };
  }

  const newResponse: FeedbackResponse = {
    ...response,
    id: response.id || `resp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    studentId: cleanStudentId,
    submittedAt: response.submittedAt || new Date().toISOString(),
  };

  db.responses.unshift(newResponse);
  writeServerDatabase(db);

  return {
    success: true,
    message: 'Feedback submitted successfully.',
    responseId: newResponse.id,
  };
}

export async function serverClearAllData(): Promise<void> {
  const db = await getServerDatabase();
  db.classes = [];
  db.batches = [];
  db.teachers = [];
  db.students = [];
  db.forms = [];
  db.responses = [];
  writeServerDatabase(db);
}
