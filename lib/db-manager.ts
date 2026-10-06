import {
  isMysqlAvailable,
  mysqlGetAllData,
  mysqlSaveClass,
  mysqlDeleteClass,
  mysqlSaveBatch,
  mysqlDeleteBatch,
  mysqlSaveTeacher,
  mysqlDeleteTeacher,
  mysqlBulkAddTeachers,
  mysqlSaveStudent,
  mysqlBulkAddStudents,
  mysqlDeleteStudent,
  mysqlUpdateStudentPassword,
  mysqlSaveFeedbackForm,
  mysqlToggleFeedbackFormStatus,
  mysqlDeleteFeedbackForm,
  mysqlSubmitFeedbackResponse,
  mysqlClearAllData,
  mysqlAdminLogin,
} from './mysql-server';

import {
  getAllData as sqliteGetAllData,
  sqliteSaveClass,
  sqliteDeleteClass,
  sqliteSaveBatch,
  sqliteDeleteBatch,
  sqliteSaveTeacher,
  sqliteDeleteTeacher,
  sqliteBulkAddTeachers,
  sqliteSaveStudent,
  sqliteBulkAddStudents,
  sqliteDeleteStudent,
  sqliteUpdateStudentPassword,
  sqliteSaveFeedbackForm,
  sqliteToggleFeedbackFormStatus,
  sqliteDeleteFeedbackForm,
  sqliteSubmitFeedbackResponse,
  sqliteClearAllData,
  getSqliteDb,
} from './sqlite-server';

import {
  ClassItem,
  BatchItem,
  TeacherItem,
  StudentItem,
  FeedbackForm,
  FeedbackResponse,
} from '@/types';

/**
 * Checks whether MySQL (phpMyAdmin localhost) is currently connected and ready.
 */
export async function isMysqlConnected(): Promise<boolean> {
  try {
    return await isMysqlAvailable();
  } catch {
    return false;
  }
}

/**
 * Fetch all institute data.
 * Uses MySQL if available; gracefully falls back to SQLite if MySQL is offline.
 */
export async function getAllData(): Promise<{
  classes: ClassItem[];
  batches: BatchItem[];
  teachers: TeacherItem[];
  students: StudentItem[];
  forms: FeedbackForm[];
  responses: FeedbackResponse[];
  lastUpdated: string;
}> {
  const mysqlUp = await isMysqlConnected();
  if (mysqlUp) {
    try {
      return await mysqlGetAllData();
    } catch (err) {
      console.warn('[DB Manager] MySQL fetch failed, falling back to SQLite:', err);
    }
  }
  return await sqliteGetAllData();
}

/**
 * Save / Update a Class
 * Dual-write: updates MySQL and synchronizes SQLite fallback.
 */
export async function saveClass(cls: ClassItem): Promise<void> {
  const mysqlUp = await isMysqlConnected();
  if (mysqlUp) {
    try {
      await mysqlSaveClass(cls);
    } catch (err) {
      console.warn('[DB Manager] MySQL saveClass failed:', err);
    }
  }
  await sqliteSaveClass(cls);
}

/**
 * Delete a Class and its associated batches
 * Deletes from both MySQL and SQLite so deleted data never reappears.
 */
export async function deleteClass(id: string): Promise<void> {
  const mysqlUp = await isMysqlConnected();
  if (mysqlUp) {
    try {
      await mysqlDeleteClass(id);
    } catch (err) {
      console.warn('[DB Manager] MySQL deleteClass failed:', err);
    }
  }
  await sqliteDeleteClass(id);
}

/**
 * Save / Update a Batch
 * Dual-write: updates MySQL and synchronizes SQLite fallback.
 */
export async function saveBatch(batch: BatchItem): Promise<void> {
  const mysqlUp = await isMysqlConnected();
  if (mysqlUp) {
    try {
      await mysqlSaveBatch(batch);
    } catch (err) {
      console.warn('[DB Manager] MySQL saveBatch failed:', err);
    }
  }
  await sqliteSaveBatch(batch);
}

/**
 * Delete a Batch
 * Deletes from both MySQL and SQLite so deleted data never reappears.
 */
export async function deleteBatch(id: string): Promise<void> {
  const mysqlUp = await isMysqlConnected();
  if (mysqlUp) {
    try {
      await mysqlDeleteBatch(id);
    } catch (err) {
      console.warn('[DB Manager] MySQL deleteBatch failed:', err);
    }
  }
  await sqliteDeleteBatch(id);
}

/**
 * Save / Update a Teacher
 * Dual-write: updates MySQL and synchronizes SQLite fallback.
 */
export async function saveTeacher(teacher: TeacherItem): Promise<void> {
  const mysqlUp = await isMysqlConnected();
  if (mysqlUp) {
    try {
      await mysqlSaveTeacher(teacher);
    } catch (err) {
      console.warn('[DB Manager] MySQL saveTeacher failed:', err);
    }
  }
  await sqliteSaveTeacher(teacher);
}

/**
 * Delete a Teacher
 * Deletes from both MySQL and SQLite so deleted data never reappears.
 */
export async function deleteTeacher(id: string): Promise<void> {
  const mysqlUp = await isMysqlConnected();
  if (mysqlUp) {
    try {
      await mysqlDeleteTeacher(id);
    } catch (err) {
      console.warn('[DB Manager] MySQL deleteTeacher failed:', err);
    }
  }
  await sqliteDeleteTeacher(id);
}

/**
 * Bulk Add Teachers
 * Dual-write to both MySQL and SQLite.
 */
export async function bulkAddTeachers(
  teachers: any[]
): Promise<{ addedCount: number; duplicateCount: number }> {
  const normalizedTeachers: TeacherItem[] = teachers
    .filter((t) => t && t.name && t.employeeId)
    .map((t) => ({
      id: t.id || `tea-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      employeeId: t.employeeId,
      name: t.name,
      email: t.email || '',
      phone: t.phone || '',
      subjectSpecialization: Array.isArray(t.subjectSpecialization) ? t.subjectSpecialization : [],
      assignedBatchIds: Array.isArray(t.assignedBatchIds) ? t.assignedBatchIds : [],
      status: t.status === 'on_leave' ? 'on_leave' : 'active',
      createdAt: t.createdAt || new Date().toISOString(),
    }));

  const mysqlUp = await isMysqlConnected();
  if (mysqlUp) {
    try {
      await mysqlBulkAddTeachers(normalizedTeachers);
    } catch (err) {
      console.warn('[DB Manager] MySQL bulkAddTeachers failed:', err);
    }
  }
  return await sqliteBulkAddTeachers(normalizedTeachers);
}

/**
 * Save / Update a Student
 * Dual-write: updates MySQL and synchronizes SQLite fallback.
 */
export async function saveStudent(student: StudentItem): Promise<void> {
  const mysqlUp = await isMysqlConnected();
  if (mysqlUp) {
    try {
      await mysqlSaveStudent(student);
    } catch (err) {
      console.warn('[DB Manager] MySQL saveStudent failed:', err);
    }
  }
  await sqliteSaveStudent(student);
}

/**
 * Bulk Add Students
 * Dual-write to both MySQL and SQLite.
 */
export async function bulkAddStudents(
  students: any[]
): Promise<{ addedCount: number; duplicateCount: number }> {
  const normalizedStudents: StudentItem[] = students
    .filter((s) => s && s.name && s.studentId)
    .map((s) => ({
      id: s.id || `stu-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      studentId: s.studentId,
      name: s.name,
      dob: s.dob || '',
      password: s.password || '',
      hasChangedPassword: Boolean(s.hasChangedPassword),
      batchId: s.batchId || '',
      classId: s.classId || '',
      createdAt: s.createdAt || new Date().toISOString(),
    }));

  const mysqlUp = await isMysqlConnected();
  if (mysqlUp) {
    try {
      await mysqlBulkAddStudents(normalizedStudents);
    } catch (err) {
      console.warn('[DB Manager] MySQL bulkAddStudents failed:', err);
    }
  }
  return await sqliteBulkAddStudents(normalizedStudents);
}

/**
 * Delete a Student
 * Deletes from both MySQL and SQLite.
 */
export async function deleteStudent(id: string): Promise<void> {
  const mysqlUp = await isMysqlConnected();
  if (mysqlUp) {
    try {
      await mysqlDeleteStudent(id);
    } catch (err) {
      console.warn('[DB Manager] MySQL deleteStudent failed:', err);
    }
  }
  await sqliteDeleteStudent(id);
}

/**
 * Update Student Password
 * Dual-write to both MySQL and SQLite.
 */
export async function updateStudentPassword(studentId: string, newPass: string): Promise<boolean> {
  let success = false;
  const mysqlUp = await isMysqlConnected();
  if (mysqlUp) {
    try {
      success = await mysqlUpdateStudentPassword(studentId, newPass);
    } catch (err) {
      console.warn('[DB Manager] MySQL updateStudentPassword failed:', err);
    }
  }
  const sqliteSuccess = await sqliteUpdateStudentPassword(studentId, newPass);
  return success || sqliteSuccess;
}

/**
 * Save / Update Feedback Form
 * Dual-write to both MySQL and SQLite.
 */
export async function saveFeedbackForm(form: FeedbackForm): Promise<void> {
  const mysqlUp = await isMysqlConnected();
  if (mysqlUp) {
    try {
      await mysqlSaveFeedbackForm(form);
    } catch (err) {
      console.warn('[DB Manager] MySQL saveFeedbackForm failed:', err);
    }
  }
  await sqliteSaveFeedbackForm(form);
}

/**
 * Toggle Feedback Form Status
 * Dual-write to both MySQL and SQLite.
 */
export async function toggleFeedbackFormStatus(id: string): Promise<string> {
  let status = 'closed';
  const mysqlUp = await isMysqlConnected();
  if (mysqlUp) {
    try {
      status = await mysqlToggleFeedbackFormStatus(id);
    } catch (err) {
      console.warn('[DB Manager] MySQL toggleFeedbackFormStatus failed:', err);
    }
  }
  const sqliteStatus = await sqliteToggleFeedbackFormStatus(id);
  return status || sqliteStatus;
}

/**
 * Delete Feedback Form
 * Deletes form and responses from both MySQL and SQLite.
 */
export async function deleteFeedbackForm(id: string): Promise<void> {
  const mysqlUp = await isMysqlConnected();
  if (mysqlUp) {
    try {
      await mysqlDeleteFeedbackForm(id);
    } catch (err) {
      console.warn('[DB Manager] MySQL deleteFeedbackForm failed:', err);
    }
  }
  await sqliteDeleteFeedbackForm(id);
}

/**
 * Submit Feedback Response
 * Dual-write to both MySQL and SQLite with duplicate prevention.
 */
export async function submitFeedbackResponse(
  response: Omit<FeedbackResponse, 'id' | 'submittedAt'> & { id?: string; submittedAt?: string }
): Promise<{
  success: boolean;
  message: string;
  responseId?: string;
}> {
  const mysqlUp = await isMysqlConnected();
  let result: { success: boolean; message: string; responseId?: string } = {
    success: true,
    message: 'Submitted successfully',
  };

  if (mysqlUp) {
    try {
      result = await mysqlSubmitFeedbackResponse(response);
      if (!result.success) {
        return result; // Duplicate submission or validation error
      }
    } catch (err: any) {
      console.warn('[DB Manager] MySQL submitFeedbackResponse failed:', err.message);
    }
  }

  // Always mirror response to SQLite fallback
  const sqliteResult = await sqliteSubmitFeedbackResponse(response);
  if (!mysqlUp) {
    return sqliteResult;
  }
  return result;
}

/**
 * Clear All Data
 * Clears data from both databases.
 */
export async function clearAllData(): Promise<void> {
  const mysqlUp = await isMysqlConnected();
  if (mysqlUp) {
    try {
      await mysqlClearAllData();
    } catch (err) {
      console.warn('[DB Manager] MySQL clearAllData failed:', err);
    }
  }
  await sqliteClearAllData();
}

/**
 * Verify Admin Login
 */
export async function checkAdminLogin(username: string, pass: string): Promise<boolean> {
  const cleanUser = (username || '').trim().toLowerCase();
  const cleanPass = (pass || '').trim();
  const envUser = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
  const envPass = (process.env.ADMIN_PASSWORD || 'adminpassword123').trim();

  // 1. Check environment variables
  if (cleanUser === envUser && cleanPass === envPass) {
    return true;
  }

  // 2. Check MySQL admin_user
  const mysqlUp = await isMysqlConnected();
  if (mysqlUp) {
    try {
      const ok = await mysqlAdminLogin(cleanUser, cleanPass);
      if (ok) return true;
    } catch (err) {
      console.warn('[DB Manager] MySQL admin login check failed:', err);
    }
  }

  // 3. Check SQLite admin_user table
  try {
    const db = await getSqliteDb();
    const stmt = db.prepare('SELECT password FROM admin_user WHERE LOWER(username) = ?');
    stmt.bind([cleanUser]);
    if (stmt.step()) {
      const row = stmt.getAsObject() as { password?: string };
      if (row.password && row.password === cleanPass) {
        stmt.free();
        return true;
      }
    }
    stmt.free();
  } catch (dbErr) {
    console.warn('[DB Manager] SQLite admin login check failed:', dbErr);
  }

  return false;
}

/**
 * Returns comprehensive status of the database layer.
 * Displays whether MySQL (phpMyAdmin) is active, or if system is running on SQLite fallback.
 */
export async function getActiveDatabaseInfo(): Promise<{
  type: string;
  status: string;
  mysqlHost?: string;
  mysqlDatabase?: string;
  fallback: string;
  classesCount: number;
  batchesCount: number;
  teachersCount: number;
  studentsCount: number;
  formsCount: number;
  responsesCount: number;
  lastUpdated: string;
}> {
  const mysqlUp = await isMysqlConnected();

  if (mysqlUp) {
    try {
      const data = await mysqlGetAllData();
      return {
        type: 'mysql',
        status: 'connected',
        mysqlHost: `${process.env.MYSQL_HOST || '127.0.0.1'}:${process.env.MYSQL_PORT || 3306}`,
        mysqlDatabase: process.env.MYSQL_DATABASE || 'edupulse_feedback',
        fallback: 'sqlite (hot standby / synchronized)',
        classesCount: data.classes.length,
        batchesCount: data.batches.length,
        teachersCount: data.teachers.length,
        studentsCount: data.students.length,
        formsCount: data.forms.length,
        responsesCount: data.responses.length,
        lastUpdated: data.lastUpdated,
      };
    } catch (err) {
      console.warn('[DB Manager] MySQL status info retrieval failed:', err);
    }
  }

  const sqliteData = await sqliteGetAllData();
  return {
    type: 'sqlite',
    status: 'connected (fallback mode)',
    fallback: 'active',
    classesCount: sqliteData.classes.length,
    batchesCount: sqliteData.batches.length,
    teachersCount: sqliteData.teachers.length,
    studentsCount: sqliteData.students.length,
    formsCount: sqliteData.forms.length,
    responsesCount: sqliteData.responses.length,
    lastUpdated: sqliteData.lastUpdated,
  };
}
