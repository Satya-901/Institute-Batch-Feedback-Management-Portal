import { createRequire } from 'module';
import type { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import {
  ClassItem,
  BatchItem,
  TeacherItem,
  StudentItem,
  FeedbackForm,
  FeedbackResponse,
  FormTemplate,
} from '@/types';
import { DEFAULT_FORM_TEMPLATES } from './default-templates';

const require = createRequire(import.meta.url);

let sqlLibInstance: any = null;

async function getSqlLib(): Promise<any> {
  if (sqlLibInstance) return sqlLibInstance;

  try {
    // 1. Try pure JavaScript / ASM.js version of sql.js (requires NO .wasm binary file, 100% serverless/Netlify compatible)
    const initSqlAsm = require('sql.js/dist/sql-asm.js');
    sqlLibInstance = await initSqlAsm();
    return sqlLibInstance;
  } catch (err) {
    console.warn('sql-asm.js could not be loaded, trying sql.js with locateFile:', err);
  }

  try {
    const initSqlJs = require('sql.js');
    sqlLibInstance = await initSqlJs({
      locateFile: (file: string) => path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
    });
    return sqlLibInstance;
  } catch (err) {
    console.error('All sql.js initialization methods failed:', err);
    throw err;
  }
}

let dbInstance: Database | null = null;

function getDbPaths() {
  const localDbDir = path.join(process.cwd(), 'data');
  const localDbPath = path.join(localDbDir, 'edupulse.sqlite');
  const tmpDbDir = '/tmp';
  const tmpDbPath = path.join(tmpDbDir, 'edupulse.sqlite');
  return { localDbDir, localDbPath, tmpDbDir, tmpDbPath };
}

/**
 * Initializes and returns the SQLite database instance
 */
export async function getSqliteDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const SQL = await getSqlLib();
  const { localDbDir, localDbPath, tmpDbPath } = getDbPaths();

  let fileBuffer: Buffer | null = null;
  // 1. Check if an updated database exists in /tmp (from previous serverless execution)
  if (fs.existsSync(tmpDbPath)) {
    try {
      fileBuffer = fs.readFileSync(tmpDbPath);
    } catch {}
  }

  // 2. Otherwise load the bundled data/edupulse.sqlite
  if (!fileBuffer && fs.existsSync(localDbPath)) {
    try {
      fileBuffer = fs.readFileSync(localDbPath);
    } catch (err) {
      console.warn('Error reading local sqlite file, creating in-memory:', err);
    }
  }

  if (fileBuffer) {
    try {
      dbInstance = new SQL.Database(fileBuffer);
    } catch (err) {
      console.error('Error loading existing sqlite file, creating new:', err);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  const db = dbInstance || new SQL.Database();
  dbInstance = db;
  initSchema(db);
  saveDatabase(db);
  return db;
}

/**
 * Persists the in-memory SQLite database to disk (/data/edupulse.sqlite or /tmp/edupulse.sqlite in serverless)
 */
export function saveDatabase(db: Database): void {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    const { localDbDir, localDbPath, tmpDbPath } = getDbPaths();

    // 1. Try local data folder
    try {
      if (!fs.existsSync(localDbDir)) {
        fs.mkdirSync(localDbDir, { recursive: true });
      }
      const tempFile = `${localDbPath}.tmp.${Date.now()}`;
      fs.writeFileSync(tempFile, buffer);
      fs.renameSync(tempFile, localDbPath);
    } catch (writeErr) {
      // Local dir may be read-only in Netlify/Vercel serverless environment
    }

    // 2. Also write to /tmp so warm serverless instances retain state
    try {
      fs.writeFileSync(tmpDbPath, buffer);
    } catch {}
  } catch (err) {
    console.error('Failed to save sqlite database to disk:', err);
  }
}

/**
 * Ensures all required SQLite tables and schema exist
 */
function initSchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      department TEXT,
      academicYear TEXT,
      description TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS batches (
      id TEXT PRIMARY KEY,
      classId TEXT NOT NULL,
      name TEXT NOT NULL,
      code TEXT,
      timing TEXT,
      roomNumber TEXT,
      maxCapacity INTEGER,
      academicYear TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS teachers (
      id TEXT PRIMARY KEY,
      employeeId TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      subjectSpecialization TEXT,
      assignedBatchIds TEXT,
      status TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      studentId TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      dob TEXT,
      password TEXT,
      hasChangedPassword INTEGER DEFAULT 0,
      batchId TEXT,
      classId TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS feedback_forms (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      classId TEXT,
      batchId TEXT NOT NULL,
      teacherId TEXT,
      questions TEXT NOT NULL,
      status TEXT NOT NULL,
      expiresAt TEXT,
      shareableCode TEXT UNIQUE NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS feedback_responses (
      id TEXT PRIMARY KEY,
      formId TEXT NOT NULL,
      classId TEXT,
      batchId TEXT,
      studentId TEXT NOT NULL,
      studentName TEXT NOT NULL,
      teacherId TEXT,
      answers TEXT NOT NULL,
      totalScore REAL,
      maxPossibleScore REAL,
      scorePercentage REAL,
      submittedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_user (
      username TEXT PRIMARY KEY,
      password TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS form_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      questions TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT,
      updatedAt TEXT
    );
  `);

  try {
    const seedCheck = queryObjects<{ setting_value: string }>(
      db,
      "SELECT setting_value FROM system_settings WHERE setting_key = 'initial_templates_seeded'"
    );
    if (!seedCheck || seedCheck.length === 0) {
      const tmplCount = queryObjects<{ c: number }>(db, 'SELECT count(*) as c FROM form_templates');
      if (!tmplCount || tmplCount[0]?.c === 0) {
        for (const tmpl of DEFAULT_FORM_TEMPLATES) {
          db.run(
            `INSERT OR IGNORE INTO form_templates (id, name, description, questions, createdAt)
             VALUES (?, ?, ?, ?, ?)`,
            [tmpl.id, tmpl.name, tmpl.description || '', JSON.stringify(tmpl.questions), tmpl.createdAt]
          );
        }
      }
      db.run(
        `INSERT OR REPLACE INTO system_settings (setting_key, setting_value, updatedAt)
         VALUES ('initial_templates_seeded', '1', ?);`,
        [new Date().toISOString()]
      );
    }
  } catch {}

  try {
    db.run('ALTER TABLE feedback_forms ADD COLUMN classId TEXT;');
  } catch {}

  try {
    db.run('ALTER TABLE feedback_responses ADD COLUMN classId TEXT;');
  } catch {}

  try {
    db.run('ALTER TABLE students ADD COLUMN classId TEXT;');
  } catch {}

  try {
    db.run('ALTER TABLE feedback_responses ADD COLUMN totalScore REAL;');
  } catch {}

  try {
    db.run('ALTER TABLE feedback_responses ADD COLUMN maxPossibleScore REAL;');
  } catch {}

  try {
    db.run('ALTER TABLE feedback_responses ADD COLUMN scorePercentage REAL;');
  } catch {}

  try {
    db.run('ALTER TABLE batches ADD COLUMN code TEXT;');
  } catch {}

  try {
    const defaultPass = process.env.ADMIN_PASSWORD || 'adminpassword123';
    db.run(
      'INSERT OR IGNORE INTO admin_user (username, password) VALUES (?, ?);',
      ['admin', defaultPass]
    );
  } catch {}
}

/**
 * Helper to execute a prepared statement and map all rows as typed objects
 */
function queryObjects<T = any>(db: Database, sql: string, params: any[] = []): T[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

// ---------------------------------------------------------------------------
// Server SQLite Query & CRUD Operations
// ---------------------------------------------------------------------------

export async function getAllData(): Promise<{
  classes: ClassItem[];
  batches: BatchItem[];
  teachers: TeacherItem[];
  students: StudentItem[];
  forms: FeedbackForm[];
  responses: FeedbackResponse[];
  templates: FormTemplate[];
  lastUpdated: string;
}> {
  const db = await getSqliteDb();

  const rawClasses = queryObjects<any>(db, 'SELECT * FROM classes ORDER BY createdAt DESC');
  const classes: ClassItem[] = rawClasses.map((c) => ({
    id: c.id,
    name: c.name,
    code: c.code,
    department: c.department || '',
    academicYear: c.academicYear || '',
    description: c.description || '',
    createdAt: c.createdAt,
  }));

  const rawBatches = queryObjects<any>(db, 'SELECT * FROM batches ORDER BY createdAt DESC');
  const batches: BatchItem[] = rawBatches.map((b) => ({
    id: b.id,
    classId: b.classId,
    name: b.name,
    code: b.code || '',
    timing: b.timing || '',
    roomNumber: b.roomNumber || '',
    maxCapacity: Number(b.maxCapacity) || 0,
    academicYear: b.academicYear || '',
    createdAt: b.createdAt,
  }));

  const rawTeachers = queryObjects<any>(db, 'SELECT * FROM teachers ORDER BY createdAt DESC');
  const teachers: TeacherItem[] = rawTeachers.map((t) => {
    let subjectSpecialization: string[] = [];
    let assignedBatchIds: string[] = [];
    try {
      subjectSpecialization = JSON.parse(t.subjectSpecialization || '[]');
    } catch {
      subjectSpecialization = t.subjectSpecialization ? [t.subjectSpecialization] : [];
    }
    try {
      assignedBatchIds = JSON.parse(t.assignedBatchIds || '[]');
    } catch {
      assignedBatchIds = [];
    }
    return {
      id: t.id,
      employeeId: t.employeeId,
      name: t.name,
      email: t.email || '',
      phone: t.phone || '',
      subjectSpecialization,
      assignedBatchIds,
      status: (t.status === 'on_leave' ? 'on_leave' : 'active') as 'active' | 'on_leave',
      createdAt: t.createdAt,
    };
  });

  const rawStudents = queryObjects<any>(db, 'SELECT * FROM students ORDER BY createdAt DESC');
  const students: StudentItem[] = rawStudents.map((s) => ({
    id: s.id,
    studentId: s.studentId,
    name: s.name,
    dob: s.dob || '',
    password: s.password || '',
    hasChangedPassword: Boolean(s.hasChangedPassword),
    batchId: s.batchId || '',
    classId: s.classId || '',
    createdAt: s.createdAt,
  }));

  const rawForms = queryObjects<any>(db, 'SELECT * FROM feedback_forms ORDER BY createdAt DESC');
  const forms: FeedbackForm[] = rawForms.map((f) => {
    let questions = [];
    try {
      questions = JSON.parse(f.questions || '[]');
    } catch {
      questions = [];
    }
    return {
      id: f.id,
      title: f.title,
      description: f.description || '',
      classId: f.classId || '',
      batchId: f.batchId,
      questions,
      status: (f.status === 'closed' ? 'closed' : 'active') as 'active' | 'closed',
      expiresAt: f.expiresAt || '',
      shareableCode: f.shareableCode,
      createdAt: f.createdAt,
    };
  });

  const rawResponses = queryObjects<any>(
    db,
    'SELECT * FROM feedback_responses ORDER BY submittedAt DESC'
  );
  const responses: FeedbackResponse[] = rawResponses.map((r) => {
    let answers = {};
    try {
      answers = JSON.parse(r.answers || '{}');
    } catch {
      answers = {};
    }
    return {
      id: r.id,
      formId: r.formId,
      classId: r.classId || '',
      batchId: r.batchId || '',
      studentId: r.studentId,
      studentName: r.studentName,
      teacherId: r.teacherId || '',
      answers,
      totalScore: r.totalScore !== null && r.totalScore !== undefined ? Number(r.totalScore) : undefined,
      maxPossibleScore:
        r.maxPossibleScore !== null && r.maxPossibleScore !== undefined
          ? Number(r.maxPossibleScore)
          : undefined,
      scorePercentage:
        r.scorePercentage !== null && r.scorePercentage !== undefined
          ? Number(r.scorePercentage)
          : undefined,
      submittedAt: r.submittedAt,
    };
  });

  const rawTemplates = queryObjects<any>(
    db,
    'SELECT * FROM form_templates ORDER BY createdAt DESC'
  );
  const templates: FormTemplate[] = rawTemplates.map((t) => {
    let questions = [];
    try {
      questions = JSON.parse(t.questions || '[]');
    } catch {
      questions = [];
    }
    return {
      id: t.id,
      name: t.name,
      description: t.description || '',
      questions,
      createdAt: t.createdAt,
    };
  });

  return {
    classes,
    batches,
    teachers,
    students,
    forms,
    responses,
    templates,
    lastUpdated: new Date().toISOString(),
  };
}

export async function sqliteSaveClass(cls: ClassItem): Promise<void> {
  const db = await getSqliteDb();
  db.run(
    `INSERT OR REPLACE INTO classes (id, name, code, department, academicYear, description, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      cls.id,
      cls.name,
      cls.code,
      cls.department || '',
      cls.academicYear || '',
      cls.description || '',
      cls.createdAt || new Date().toISOString(),
    ]
  );
  saveDatabase(db);
}

export async function sqliteDeleteClass(id: string): Promise<void> {
  const db = await getSqliteDb();
  db.run('DELETE FROM classes WHERE id = ?', [id]);
  db.run('DELETE FROM batches WHERE classId = ?', [id]);
  saveDatabase(db);
}

export async function sqliteSaveBatch(batch: BatchItem): Promise<void> {
  const db = await getSqliteDb();
  db.run(
    `INSERT OR REPLACE INTO batches (id, classId, name, code, timing, roomNumber, maxCapacity, academicYear, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      batch.id,
      batch.classId,
      batch.name,
      batch.code || '',
      batch.timing || '',
      batch.roomNumber || '',
      Number(batch.maxCapacity) || 0,
      batch.academicYear || '',
      batch.createdAt || new Date().toISOString(),
    ]
  );
  saveDatabase(db);
}

export async function sqliteDeleteBatch(id: string): Promise<void> {
  const db = await getSqliteDb();
  db.run('DELETE FROM batches WHERE id = ?', [id]);
  saveDatabase(db);
}

export async function sqliteSaveTeacher(teacher: TeacherItem): Promise<void> {
  const db = await getSqliteDb();
  db.run(
    `INSERT OR REPLACE INTO teachers (id, employeeId, name, email, phone, subjectSpecialization, assignedBatchIds, status, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      teacher.id,
      teacher.employeeId,
      teacher.name,
      teacher.email || '',
      teacher.phone || '',
      JSON.stringify(teacher.subjectSpecialization || []),
      JSON.stringify(teacher.assignedBatchIds || []),
      teacher.status || 'active',
      teacher.createdAt || new Date().toISOString(),
    ]
  );
  saveDatabase(db);
}

export async function sqliteDeleteTeacher(id: string): Promise<void> {
  const db = await getSqliteDb();
  db.run('DELETE FROM teachers WHERE id = ?', [id]);
  saveDatabase(db);
}

export async function sqliteBulkAddTeachers(
  teachers: TeacherItem[]
): Promise<{ addedCount: number; duplicateCount: number }> {
  const db = await getSqliteDb();
  const existingRows = queryObjects<{ key: string }>(
    db,
    "SELECT UPPER(COALESCE(NULLIF(employeeId, ''), name)) as key FROM teachers"
  );
  const existingSet = new Set(existingRows.map((r) => r.key));

  let added = 0;
  let duplicates = 0;

  for (const t of teachers) {
    const key = (t.employeeId || t.name || '').trim().toUpperCase();
    if (existingSet.has(key)) {
      duplicates++;
    } else {
      existingSet.add(key);
      db.run(
        `INSERT OR REPLACE INTO teachers (id, employeeId, name, email, phone, subjectSpecialization, assignedBatchIds, status, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          t.id || `tea-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          t.employeeId,
          t.name,
          t.email || '',
          t.phone || '',
          JSON.stringify(t.subjectSpecialization || []),
          JSON.stringify(t.assignedBatchIds || []),
          t.status || 'active',
          t.createdAt || new Date().toISOString(),
        ]
      );
      added++;
    }
  }

  if (added > 0) {
    saveDatabase(db);
  }
  return { addedCount: added, duplicateCount: duplicates };
}

export async function sqliteSaveStudent(student: StudentItem): Promise<void> {
  const db = await getSqliteDb();
  const cleanId = (student.studentId || '').trim().toUpperCase();
  db.run(
    `INSERT OR REPLACE INTO students (id, studentId, name, dob, password, hasChangedPassword, batchId, classId, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      student.id,
      cleanId,
      student.name,
      student.dob || '',
      student.password || '',
      student.hasChangedPassword ? 1 : 0,
      student.batchId || '',
      student.classId || '',
      student.createdAt || new Date().toISOString(),
    ]
  );
  saveDatabase(db);
}

export async function sqliteBulkAddStudents(
  students: StudentItem[]
): Promise<{ addedCount: number; duplicateCount: number }> {
  const db = await getSqliteDb();
  const existingRows = queryObjects<{ studentId: string }>(
    db,
    'SELECT UPPER(studentId) as studentId FROM students'
  );
  const existingSet = new Set(existingRows.map((r) => r.studentId));

  let added = 0;
  let duplicates = 0;

  for (const s of students) {
    const cleanId = (s.studentId || '').trim().toUpperCase();
    if (existingSet.has(cleanId)) {
      duplicates++;
    } else {
      existingSet.add(cleanId);
      db.run(
        `INSERT OR REPLACE INTO students (id, studentId, name, dob, password, hasChangedPassword, batchId, classId, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          s.id || `stu-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          cleanId,
          s.name,
          s.dob || '',
          s.password || '',
          s.hasChangedPassword ? 1 : 0,
          s.batchId || '',
          s.classId || '',
          s.createdAt || new Date().toISOString(),
        ]
      );
      added++;
    }
  }

  if (added > 0) {
    saveDatabase(db);
  }
  return { addedCount: added, duplicateCount: duplicates };
}

export async function sqliteDeleteStudent(id: string): Promise<void> {
  const db = await getSqliteDb();
  const clean = id.trim().toUpperCase();
  db.run('DELETE FROM students WHERE id = ? OR UPPER(studentId) = ?', [id, clean]);
  saveDatabase(db);
}

export async function sqliteUpdateStudentPassword(
  studentId: string,
  newPassword: string
): Promise<boolean> {
  const db = await getSqliteDb();
  const clean = studentId.trim().toUpperCase();
  db.run('UPDATE students SET password = ?, hasChangedPassword = 1 WHERE UPPER(studentId) = ?', [
    newPassword,
    clean,
  ]);
  saveDatabase(db);
  return true;
}

export async function sqliteSaveFeedbackForm(form: FeedbackForm): Promise<void> {
  const db = await getSqliteDb();
  db.run(
    `INSERT OR REPLACE INTO feedback_forms (id, title, description, classId, batchId, teacherId, questions, status, expiresAt, shareableCode, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      form.id,
      form.title,
      form.description || '',
      form.classId || '',
      form.batchId,
      '',
      JSON.stringify(form.questions || []),
      form.status || 'active',
      form.expiresAt || '',
      form.shareableCode,
      form.createdAt || new Date().toISOString(),
    ]
  );
  saveDatabase(db);
}

export async function sqliteToggleFeedbackFormStatus(id: string): Promise<'active' | 'closed'> {
  const db = await getSqliteDb();
  const rows = queryObjects<{ status: string }>(
    db,
    'SELECT status FROM feedback_forms WHERE id = ?',
    [id]
  );
  if (rows.length > 0) {
    const nextStatus = rows[0].status === 'active' ? 'closed' : 'active';
    db.run('UPDATE feedback_forms SET status = ? WHERE id = ?', [nextStatus, id]);
    saveDatabase(db);
    return nextStatus;
  }
  return 'closed';
}

export async function sqliteDeleteFeedbackForm(id: string): Promise<void> {
  const db = await getSqliteDb();
  db.run('DELETE FROM feedback_forms WHERE id = ?', [id]);
  db.run('DELETE FROM feedback_responses WHERE formId = ?', [id]);
  saveDatabase(db);
}

export async function sqliteSubmitFeedbackResponse(
  response: Omit<FeedbackResponse, 'id' | 'submittedAt'> & { id?: string; submittedAt?: string }
): Promise<{ success: boolean; message: string; responseId?: string }> {
  const db = await getSqliteDb();
  const cleanStudentId = (response.studentId || '').trim().toUpperCase();
  const safeTeacherId = response.teacherId || '';

  // Duplicate check in SQLite
  const existing = safeTeacherId
    ? queryObjects(
        db,
        'SELECT id FROM feedback_responses WHERE formId = ? AND UPPER(studentId) = ? AND teacherId = ?',
        [response.formId, cleanStudentId, safeTeacherId]
      )
    : queryObjects(
        db,
        'SELECT id FROM feedback_responses WHERE formId = ? AND UPPER(studentId) = ?',
        [response.formId, cleanStudentId]
      );

  if (existing.length > 0) {
    return {
      success: false,
      message: 'You have already submitted feedback for this faculty member.',
    };
  }

  const id = response.id || `resp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const submittedAt = response.submittedAt || new Date().toISOString();

  db.run(
    `INSERT INTO feedback_responses (id, formId, classId, batchId, studentId, studentName, teacherId, answers, totalScore, maxPossibleScore, scorePercentage, submittedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      response.formId,
      response.classId || '',
      response.batchId || '',
      cleanStudentId,
      response.studentName,
      safeTeacherId,
      JSON.stringify(response.answers || {}),
      response.totalScore !== undefined ? response.totalScore : null,
      response.maxPossibleScore !== undefined ? response.maxPossibleScore : null,
      response.scorePercentage !== undefined ? response.scorePercentage : null,
      submittedAt,
    ]
  );
  saveDatabase(db);

  return {
    success: true,
    message: 'Feedback submitted successfully.',
    responseId: id,
  };
}

export async function sqliteSaveFormTemplate(template: FormTemplate): Promise<void> {
  const db = await getSqliteDb();
  db.run(
    `INSERT OR REPLACE INTO form_templates (id, name, description, questions, createdAt)
     VALUES (?, ?, ?, ?, ?)`,
    [
      template.id,
      template.name,
      template.description || '',
      JSON.stringify(template.questions || []),
      template.createdAt || new Date().toISOString(),
    ]
  );
  saveDatabase(db);
}

export async function sqliteDeleteFormTemplate(id: string): Promise<void> {
  const db = await getSqliteDb();
  db.run('DELETE FROM form_templates WHERE id = ?', [id]);
  saveDatabase(db);
}

export async function sqliteClearAllData(): Promise<void> {
  const db = await getSqliteDb();
  db.run('DELETE FROM classes;');
  db.run('DELETE FROM batches;');
  db.run('DELETE FROM teachers;');
  db.run('DELETE FROM students;');
  db.run('DELETE FROM feedback_forms;');
  db.run('DELETE FROM feedback_responses;');
  saveDatabase(db);
}

export async function getActiveDatabaseInfo(): Promise<{
  type: string;
  status: string;
  path: string;
  classesCount: number;
  batchesCount: number;
  teachersCount: number;
  studentsCount: number;
  formsCount: number;
  responsesCount: number;
  templatesCount: number;
  lastUpdated: string;
}> {
  const data = await getAllData();
  return {
    type: 'sqlite',
    status: 'connected',
    path: './data/edupulse.sqlite',
    classesCount: data.classes.length,
    batchesCount: data.batches.length,
    teachersCount: data.teachers.length,
    studentsCount: data.students.length,
    formsCount: data.forms.length,
    responsesCount: data.responses.length,
    templatesCount: data.templates.length,
    lastUpdated: data.lastUpdated,
  };
}
