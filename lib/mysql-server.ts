import mysql, { Pool, PoolConnection } from 'mysql2/promise';
import {
  ClassItem,
  BatchItem,
  TeacherItem,
  StudentItem,
  FeedbackForm,
  FeedbackResponse,
  FormTemplate,
} from '@/types';
import { getAllData as getSqliteAllData } from './sqlite-server';
import { DEFAULT_FORM_TEMPLATES } from './default-templates';

let pool: Pool | null = null;
let isInitialized = false;
let initPromise: Promise<boolean> | null = null;

export function getMysqlConfig() {
  return {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'edupulse_feedback',
    connectTimeout: Number(process.env.MYSQL_CONNECT_TIMEOUT) || 3000,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };
}

/**
 * Gets or creates the MySQL connection pool
 */
export function getMysqlPool(): Pool {
  if (!pool) {
    const config = getMysqlConfig();
    pool = mysql.createPool(config);
  }
  return pool;
}

/**
 * Checks if MySQL server is available on the configured host & port
 */
export async function isMysqlAvailable(): Promise<boolean> {
  const p = getMysqlPool();
  let conn: PoolConnection | null = null;
  try {
    conn = await Promise.race([
      p.getConnection(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('MySQL connection timeout')), 2500)
      ),
    ]);
    await conn.query('SELECT 1');
    return true;
  } catch (err: any) {
    return false;
  } finally {
    if (conn) {
      try {
        conn.release();
      } catch {}
    }
  }
}

/**
 * Ensures MySQL database, tables, and one-time seed migration exist.
 * Guaranteed: Once seeded, deleted items will NEVER reappear.
 */
export async function initMysqlSchemaAndSeed(): Promise<boolean> {
  if (isInitialized) return true;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const isUp = await isMysqlAvailable();
      if (!isUp) {
        return false;
      }

      const p = getMysqlPool();
      const conn = await p.getConnection();

      try {
        // 1. Create tables if they do not exist
        await conn.query(`
          CREATE TABLE IF NOT EXISTS classes (
            id VARCHAR(191) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            code VARCHAR(100) NOT NULL,
            department VARCHAR(255) DEFAULT '',
            academicYear VARCHAR(100) DEFAULT '',
            description TEXT,
            createdAt VARCHAR(100) NOT NULL
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await conn.query(`
          CREATE TABLE IF NOT EXISTS batches (
            id VARCHAR(191) PRIMARY KEY,
            classId VARCHAR(191) NOT NULL,
            name VARCHAR(255) NOT NULL,
            code VARCHAR(100) DEFAULT '',
            timing VARCHAR(255) DEFAULT '',
            roomNumber VARCHAR(100) DEFAULT '',
            maxCapacity INT DEFAULT 0,
            academicYear VARCHAR(100) DEFAULT '',
            createdAt VARCHAR(100) NOT NULL
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await conn.query(`
          CREATE TABLE IF NOT EXISTS teachers (
            id VARCHAR(191) PRIMARY KEY,
            employeeId VARCHAR(100) NOT NULL,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) DEFAULT '',
            phone VARCHAR(100) DEFAULT '',
            subjectSpecialization TEXT,
            assignedBatchIds TEXT,
            status VARCHAR(50) DEFAULT 'active',
            createdAt VARCHAR(100) NOT NULL
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await conn.query(`
          CREATE TABLE IF NOT EXISTS students (
            id VARCHAR(191) PRIMARY KEY,
            studentId VARCHAR(100) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            dob VARCHAR(100) DEFAULT '',
            password VARCHAR(255) DEFAULT '',
            hasChangedPassword TINYINT(1) DEFAULT 0,
            batchId VARCHAR(191) DEFAULT '',
            classId VARCHAR(191) DEFAULT '',
            createdAt VARCHAR(100) NOT NULL
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await conn.query(`
          CREATE TABLE IF NOT EXISTS feedback_forms (
            id VARCHAR(191) PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            classId VARCHAR(191) DEFAULT '',
            batchId VARCHAR(191) NOT NULL,
            teacherId VARCHAR(191) DEFAULT '',
            questions LONGTEXT NOT NULL,
            status VARCHAR(50) NOT NULL,
            expiresAt VARCHAR(100) DEFAULT '',
            shareableCode VARCHAR(100) UNIQUE NOT NULL,
            createdAt VARCHAR(100) NOT NULL
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await conn.query(`
          CREATE TABLE IF NOT EXISTS feedback_responses (
            id VARCHAR(191) PRIMARY KEY,
            formId VARCHAR(191) NOT NULL,
            classId VARCHAR(191) DEFAULT '',
            batchId VARCHAR(191) DEFAULT '',
            studentId VARCHAR(100) NOT NULL,
            studentName VARCHAR(255) NOT NULL,
            teacherId VARCHAR(191) DEFAULT '',
            answers LONGTEXT NOT NULL,
            totalScore DOUBLE NULL,
            maxPossibleScore DOUBLE NULL,
            scorePercentage DOUBLE NULL,
            submittedAt VARCHAR(100) NOT NULL
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await conn.query(`
          CREATE TABLE IF NOT EXISTS admin_user (
            username VARCHAR(191) PRIMARY KEY,
            password VARCHAR(255) NOT NULL
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await conn.query(`
          CREATE TABLE IF NOT EXISTS system_settings (
            setting_key VARCHAR(191) PRIMARY KEY,
            setting_value TEXT,
            updatedAt VARCHAR(100)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await conn.query(`
          CREATE TABLE IF NOT EXISTS form_templates (
            id VARCHAR(191) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            questions LONGTEXT NOT NULL,
            createdAt VARCHAR(100) NOT NULL
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Seed default templates in MySQL if table is empty
        try {
          const [tmplRows]: any = await conn.query('SELECT count(*) as c FROM form_templates');
          if (!tmplRows || tmplRows[0]?.c === 0) {
            for (const tmpl of DEFAULT_FORM_TEMPLATES) {
              await conn.query(
                `INSERT IGNORE INTO form_templates (id, name, description, questions, createdAt)
                 VALUES (?, ?, ?, ?, ?)`,
                [tmpl.id, tmpl.name, tmpl.description || '', JSON.stringify(tmpl.questions), tmpl.createdAt]
              );
            }
          }
        } catch (tErr) {
          console.warn('[MySQL] Failed to seed default form templates:', tErr);
        }

        // Always ensure default admin user exists
        const defaultAdminPass = process.env.ADMIN_PASSWORD || 'adminpassword123';
        await conn.query(
          `INSERT IGNORE INTO admin_user (username, password) VALUES (?, ?)`,
          ['admin', defaultAdminPass]
        );

        // 2. CHECK IF INITIAL SEED WAS ALREADY PERFORMED
        // If 'initial_seed_completed' flag is present in system_settings, DO NOT SEED!
        // This ensures if a user deletes a class/batch/teacher, it never re-appears!
        const [seedRows]: any = await conn.query(
          `SELECT setting_value FROM system_settings WHERE setting_key = 'initial_seed_completed'`
        );

        if (!seedRows || seedRows.length === 0) {
          console.log('[MySQL] Performing one-time initial seed migration from SQLite...');
          const sqliteData = await getSqliteAllData();

          // Seed Classes
          for (const c of sqliteData.classes) {
            await conn.query(
              `INSERT IGNORE INTO classes (id, name, code, department, academicYear, description, createdAt)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [c.id, c.name, c.code, c.department || '', c.academicYear || '', c.description || '', c.createdAt]
            );
          }

          // Seed Batches
          for (const b of sqliteData.batches) {
            await conn.query(
              `INSERT IGNORE INTO batches (id, classId, name, code, timing, roomNumber, maxCapacity, academicYear, createdAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [b.id, b.classId, b.name, b.code || '', b.timing || '', b.roomNumber || '', b.maxCapacity || 0, b.academicYear || '', b.createdAt]
            );
          }

          // Seed Teachers
          for (const t of sqliteData.teachers) {
            await conn.query(
              `INSERT IGNORE INTO teachers (id, employeeId, name, email, phone, subjectSpecialization, assignedBatchIds, status, createdAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                t.id,
                t.employeeId,
                t.name,
                t.email || '',
                t.phone || '',
                JSON.stringify(t.subjectSpecialization || []),
                JSON.stringify(t.assignedBatchIds || []),
                t.status || 'active',
                t.createdAt,
              ]
            );
          }

          // Seed Students
          for (const s of sqliteData.students) {
            await conn.query(
              `INSERT IGNORE INTO students (id, studentId, name, dob, password, hasChangedPassword, batchId, classId, createdAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                s.id,
                s.studentId,
                s.name,
                s.dob || '',
                s.password || '',
                s.hasChangedPassword ? 1 : 0,
                s.batchId || '',
                s.classId || '',
                s.createdAt,
              ]
            );
          }

          // Seed Forms
          for (const f of sqliteData.forms) {
            await conn.query(
              `INSERT IGNORE INTO feedback_forms (id, title, description, classId, batchId, teacherId, questions, status, expiresAt, shareableCode, createdAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                f.id,
                f.title,
                f.description || '',
                f.classId || '',
                f.batchId,
                (f as any).teacherId || '',
                JSON.stringify(f.questions || []),
                f.status || 'active',
                f.expiresAt || '',
                f.shareableCode,
                f.createdAt,
              ]
            );
          }

          // Seed Responses
          for (const r of sqliteData.responses) {
            await conn.query(
              `INSERT IGNORE INTO feedback_responses (id, formId, classId, batchId, studentId, studentName, teacherId, answers, totalScore, maxPossibleScore, scorePercentage, submittedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                r.id,
                r.formId,
                r.classId || '',
                r.batchId || '',
                r.studentId,
                r.studentName,
                r.teacherId || '',
                JSON.stringify(r.answers || {}),
                r.totalScore !== undefined ? r.totalScore : null,
                r.maxPossibleScore !== undefined ? r.maxPossibleScore : null,
                r.scorePercentage !== undefined ? r.scorePercentage : null,
                r.submittedAt,
              ]
            );
          }

          // Mark seeding as completed permanently
          await conn.query(
            `INSERT INTO system_settings (setting_key, setting_value, updatedAt) VALUES ('initial_seed_completed', '1', ?)
             ON DUPLICATE KEY UPDATE setting_value = '1', updatedAt = ?`,
            [new Date().toISOString(), new Date().toISOString()]
          );

          console.log('[MySQL] Seeding completed and permanent flag set!');
        }

        isInitialized = true;
        return true;
      } finally {
        conn.release();
      }
    } catch (err: any) {
      console.warn('[MySQL] Init or migration failed:', err.message);
      return false;
    }
  })();

  return initPromise;
}

// ---------------------------------------------------------------------------
// Query and CRUD Operations for MySQL
// ---------------------------------------------------------------------------

export async function mysqlGetAllData(): Promise<{
  classes: ClassItem[];
  batches: BatchItem[];
  teachers: TeacherItem[];
  students: StudentItem[];
  forms: FeedbackForm[];
  responses: FeedbackResponse[];
  templates: FormTemplate[];
  lastUpdated: string;
}> {
  await initMysqlSchemaAndSeed();
  const p = getMysqlPool();

  const [rawClasses]: any = await p.query('SELECT * FROM classes ORDER BY createdAt DESC');
  const classes: ClassItem[] = (rawClasses || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    code: c.code,
    department: c.department || '',
    academicYear: c.academicYear || '',
    description: c.description || '',
    createdAt: c.createdAt,
  }));

  const [rawBatches]: any = await p.query('SELECT * FROM batches ORDER BY createdAt DESC');
  const batches: BatchItem[] = (rawBatches || []).map((b: any) => ({
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

  const [rawTeachers]: any = await p.query('SELECT * FROM teachers ORDER BY createdAt DESC');
  const teachers: TeacherItem[] = (rawTeachers || []).map((t: any) => {
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

  const [rawStudents]: any = await p.query('SELECT * FROM students ORDER BY createdAt DESC');
  const students: StudentItem[] = (rawStudents || []).map((s: any) => ({
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

  const [rawForms]: any = await p.query('SELECT * FROM feedback_forms ORDER BY createdAt DESC');
  const forms: FeedbackForm[] = (rawForms || []).map((f: any) => {
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

  const [rawResponses]: any = await p.query(
    'SELECT * FROM feedback_responses ORDER BY submittedAt DESC'
  );
  const responses: FeedbackResponse[] = (rawResponses || []).map((r: any) => {
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

  const [rawTemplates]: any = await p.query(
    'SELECT * FROM form_templates ORDER BY createdAt DESC'
  );
  const templates: FormTemplate[] = (rawTemplates || []).map((t: any) => {
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

export async function mysqlSaveClass(cls: ClassItem): Promise<void> {
  await initMysqlSchemaAndSeed();
  const p = getMysqlPool();
  await p.query(
    `INSERT INTO classes (id, name, code, department, academicYear, description, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       code = VALUES(code),
       department = VALUES(department),
       academicYear = VALUES(academicYear),
       description = VALUES(description)`,
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
}

export async function mysqlDeleteClass(id: string): Promise<void> {
  await initMysqlSchemaAndSeed();
  const p = getMysqlPool();
  await p.query('DELETE FROM classes WHERE id = ?', [id]);
  await p.query('DELETE FROM batches WHERE classId = ?', [id]);
}

export async function mysqlSaveBatch(batch: BatchItem): Promise<void> {
  await initMysqlSchemaAndSeed();
  const p = getMysqlPool();
  await p.query(
    `INSERT INTO batches (id, classId, name, code, timing, roomNumber, maxCapacity, academicYear, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       classId = VALUES(classId),
       name = VALUES(name),
       code = VALUES(code),
       timing = VALUES(timing),
       roomNumber = VALUES(roomNumber),
       maxCapacity = VALUES(maxCapacity),
       academicYear = VALUES(academicYear)`,
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
}

export async function mysqlDeleteBatch(id: string): Promise<void> {
  await initMysqlSchemaAndSeed();
  const p = getMysqlPool();
  await p.query('DELETE FROM batches WHERE id = ?', [id]);
}

export async function mysqlSaveTeacher(teacher: TeacherItem): Promise<void> {
  await initMysqlSchemaAndSeed();
  const p = getMysqlPool();
  await p.query(
    `INSERT INTO teachers (id, employeeId, name, email, phone, subjectSpecialization, assignedBatchIds, status, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       employeeId = VALUES(employeeId),
       name = VALUES(name),
       email = VALUES(email),
       phone = VALUES(phone),
       subjectSpecialization = VALUES(subjectSpecialization),
       assignedBatchIds = VALUES(assignedBatchIds),
       status = VALUES(status)`,
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
}

export async function mysqlDeleteTeacher(id: string): Promise<void> {
  await initMysqlSchemaAndSeed();
  const p = getMysqlPool();
  await p.query('DELETE FROM teachers WHERE id = ?', [id]);
}

export async function mysqlBulkAddTeachers(teachers: Partial<TeacherItem>[]): Promise<{ added: number }> {
  await initMysqlSchemaAndSeed();
  let added = 0;
  for (const t of teachers) {
    if (!t.name || !t.employeeId) continue;
    const teacher: TeacherItem = {
      id: t.id || `teacher-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      employeeId: t.employeeId,
      name: t.name,
      email: t.email || '',
      phone: t.phone || '',
      subjectSpecialization: t.subjectSpecialization || [],
      assignedBatchIds: t.assignedBatchIds || [],
      status: t.status || 'active',
      createdAt: t.createdAt || new Date().toISOString(),
    };
    await mysqlSaveTeacher(teacher);
    added++;
  }
  return { added };
}

export async function mysqlSaveStudent(student: StudentItem): Promise<void> {
  await initMysqlSchemaAndSeed();
  const p = getMysqlPool();
  await p.query(
    `INSERT INTO students (id, studentId, name, dob, password, hasChangedPassword, batchId, classId, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       studentId = VALUES(studentId),
       name = VALUES(name),
       dob = VALUES(dob),
       password = VALUES(password),
       hasChangedPassword = VALUES(hasChangedPassword),
       batchId = VALUES(batchId),
       classId = VALUES(classId)`,
    [
      student.id,
      student.studentId,
      student.name,
      student.dob || '',
      student.password || '',
      student.hasChangedPassword ? 1 : 0,
      student.batchId || '',
      student.classId || '',
      student.createdAt || new Date().toISOString(),
    ]
  );
}

export async function mysqlBulkAddStudents(students: Partial<StudentItem>[]): Promise<{ added: number }> {
  await initMysqlSchemaAndSeed();
  let added = 0;
  for (const s of students) {
    if (!s.name || !s.studentId) continue;
    const student: StudentItem = {
      id: s.id || `student-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      studentId: s.studentId,
      name: s.name,
      dob: s.dob || '',
      password: s.password || '',
      hasChangedPassword: Boolean(s.hasChangedPassword),
      batchId: s.batchId || '',
      classId: s.classId || '',
      createdAt: s.createdAt || new Date().toISOString(),
    };
    await mysqlSaveStudent(student);
    added++;
  }
  return { added };
}

export async function mysqlDeleteStudent(id: string): Promise<void> {
  await initMysqlSchemaAndSeed();
  const p = getMysqlPool();
  await p.query('DELETE FROM students WHERE id = ?', [id]);
}

export async function mysqlUpdateStudentPassword(studentId: string, newPass: string): Promise<boolean> {
  await initMysqlSchemaAndSeed();
  const p = getMysqlPool();
  const [res]: any = await p.query(
    `UPDATE students SET password = ?, hasChangedPassword = 1 WHERE studentId = ?`,
    [newPass, studentId]
  );
  return res && res.affectedRows > 0;
}

export async function mysqlSaveFeedbackForm(form: FeedbackForm): Promise<void> {
  await initMysqlSchemaAndSeed();
  const p = getMysqlPool();
  await p.query(
    `INSERT INTO feedback_forms (id, title, description, classId, batchId, teacherId, questions, status, expiresAt, shareableCode, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       title = VALUES(title),
       description = VALUES(description),
       classId = VALUES(classId),
       batchId = VALUES(batchId),
       teacherId = VALUES(teacherId),
       questions = VALUES(questions),
       status = VALUES(status),
       expiresAt = VALUES(expiresAt),
       shareableCode = VALUES(shareableCode)`,
    [
      form.id,
      form.title,
      form.description || '',
      form.classId || '',
      form.batchId,
      (form as any).teacherId || '',
      JSON.stringify(form.questions || []),
      form.status,
      form.expiresAt || '',
      form.shareableCode,
      form.createdAt || new Date().toISOString(),
    ]
  );
}

export async function mysqlToggleFeedbackFormStatus(id: string): Promise<string> {
  await initMysqlSchemaAndSeed();
  const p = getMysqlPool();
  const [rows]: any = await p.query('SELECT status FROM feedback_forms WHERE id = ?', [id]);
  if (!rows || rows.length === 0) return 'closed';
  const newStatus = rows[0].status === 'active' ? 'closed' : 'active';
  await p.query('UPDATE feedback_forms SET status = ? WHERE id = ?', [newStatus, id]);
  return newStatus;
}

export async function mysqlDeleteFeedbackForm(id: string): Promise<void> {
  await initMysqlSchemaAndSeed();
  const p = getMysqlPool();
  await p.query('DELETE FROM feedback_forms WHERE id = ?', [id]);
  await p.query('DELETE FROM feedback_responses WHERE formId = ?', [id]);
}

export async function mysqlSubmitFeedbackResponse(response: Partial<FeedbackResponse>): Promise<{
  success: boolean;
  message: string;
  responseId?: string;
}> {
  await initMysqlSchemaAndSeed();
  const p = getMysqlPool();

  const cleanStudentId = (response.studentId || '').trim();
  const safeTeacherId = (response.teacherId || '').trim();

  // Prevent duplicate submission for same student, form, and teacher
  const [existing]: any = await p.query(
    `SELECT id FROM feedback_responses WHERE formId = ? AND studentId = ? AND teacherId = ?`,
    [response.formId, cleanStudentId, safeTeacherId]
  );

  if (existing && existing.length > 0) {
    return {
      success: false,
      message: 'You have already submitted feedback for this faculty member.',
    };
  }

  const id = response.id || `resp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const submittedAt = response.submittedAt || new Date().toISOString();

  await p.query(
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

  return {
    success: true,
    message: 'Feedback submitted successfully.',
    responseId: id,
  };
}

export async function mysqlClearAllData(): Promise<void> {
  await initMysqlSchemaAndSeed();
  const p = getMysqlPool();
  await p.query('DELETE FROM classes;');
  await p.query('DELETE FROM batches;');
  await p.query('DELETE FROM teachers;');
  await p.query('DELETE FROM students;');
  await p.query('DELETE FROM feedback_forms;');
  await p.query('DELETE FROM feedback_responses;');
}

export async function mysqlSaveFormTemplate(template: FormTemplate): Promise<void> {
  await initMysqlSchemaAndSeed();
  const p = getMysqlPool();
  await p.query(
    `INSERT INTO form_templates (id, name, description, questions, createdAt)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       description = VALUES(description),
       questions = VALUES(questions)`,
    [
      template.id,
      template.name,
      template.description || '',
      JSON.stringify(template.questions || []),
      template.createdAt || new Date().toISOString(),
    ]
  );
}

export async function mysqlDeleteFormTemplate(id: string): Promise<void> {
  await initMysqlSchemaAndSeed();
  const p = getMysqlPool();
  await p.query('DELETE FROM form_templates WHERE id = ?', [id]);
}

export async function mysqlAdminLogin(username: string, pass: string): Promise<boolean> {
  await initMysqlSchemaAndSeed();
  const p = getMysqlPool();
  const cleanUser = (username || '').trim().toLowerCase();
  const cleanPass = (pass || '').trim();

  const [rows]: any = await p.query(
    'SELECT password FROM admin_user WHERE LOWER(username) = ?',
    [cleanUser]
  );
  if (rows && rows.length > 0 && rows[0].password === cleanPass) {
    return true;
  }
  return false;
}
