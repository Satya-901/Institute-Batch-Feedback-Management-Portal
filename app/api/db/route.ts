import { NextRequest, NextResponse } from 'next/server';
import { getSqliteDb, saveDatabase } from '@/lib/sqlite-server';

export async function GET() {
  try {
    const db = await getSqliteDb();

    // Query classes
    const classesRes = db.exec('SELECT * FROM classes ORDER BY createdAt DESC');
    const classes = classesRes.length > 0
      ? classesRes[0].values.map((row) => ({
          id: row[0] as string,
          name: row[1] as string,
          code: row[2] as string,
          department: row[3] as string,
          academicYear: row[4] as string,
          description: row[5] as string,
          createdAt: row[6] as string,
        }))
      : [];

    // Query batches
    const batchesRes = db.exec('SELECT * FROM batches ORDER BY createdAt DESC');
    const batches = batchesRes.length > 0
      ? batchesRes[0].values.map((row) => ({
          id: row[0] as string,
          classId: row[1] as string,
          name: row[2] as string,
          timing: row[3] as string,
          roomNumber: row[4] as string,
          maxCapacity: Number(row[5]) || 40,
          academicYear: row[6] as string,
          createdAt: row[7] as string,
        }))
      : [];

    // Query teachers
    const teachersRes = db.exec('SELECT * FROM teachers ORDER BY createdAt DESC');
    const teachers = teachersRes.length > 0
      ? teachersRes[0].values.map((row) => ({
          id: row[0] as string,
          employeeId: row[1] as string,
          name: row[2] as string,
          email: row[3] as string,
          phone: row[4] as string,
          subjectSpecialization: JSON.parse((row[5] as string) || '[]'),
          assignedBatchIds: JSON.parse((row[6] as string) || '[]'),
          status: (row[7] as string) || 'active',
          createdAt: row[8] as string,
        }))
      : [];

    // Query students
    const studentsRes = db.exec('SELECT * FROM students ORDER BY createdAt DESC');
    const students = studentsRes.length > 0
      ? studentsRes[0].values.map((row) => ({
          id: row[0] as string,
          studentId: row[1] as string,
          name: row[2] as string,
          dob: row[3] as string,
          password: row[4] as string,
          hasChangedPassword: Boolean(row[5]),
          batchId: row[6] as string,
          createdAt: row[7] as string,
        }))
      : [];

    // Query feedback forms
    const formsRes = db.exec('SELECT id, title, description, batchId, teacherId, questions, status, expiresAt, shareableCode, createdAt, classId FROM feedback_forms ORDER BY createdAt DESC');
    const forms = formsRes.length > 0
      ? formsRes[0].values.map((row) => ({
          id: row[0] as string,
          title: row[1] as string,
          description: row[2] as string,
          batchId: (row[3] as string) || '',
          teacherId: (row[4] as string) || undefined,
          questions: JSON.parse((row[5] as string) || '[]'),
          status: row[6] as 'active' | 'closed',
          expiresAt: (row[7] as string) || undefined,
          shareableCode: row[8] as string,
          createdAt: row[9] as string,
          classId: (row[10] as string) || '',
        }))
      : [];

    // Query feedback responses
    const responsesRes = db.exec('SELECT id, formId, batchId, studentId, studentName, teacherId, answers, submittedAt, classId, totalScore, maxPossibleScore, scorePercentage FROM feedback_responses ORDER BY submittedAt DESC');
    const responses = responsesRes.length > 0
      ? responsesRes[0].values.map((row) => ({
          id: row[0] as string,
          formId: row[1] as string,
          batchId: (row[2] as string) || '',
          studentId: row[3] as string,
          studentName: row[4] as string,
          teacherId: (row[5] as string) || undefined,
          answers: JSON.parse((row[6] as string) || '{}'),
          submittedAt: row[7] as string,
          classId: (row[8] as string) || '',
          totalScore: Number(row[9]) || 0,
          maxPossibleScore: Number(row[10]) || 0,
          scorePercentage: Number(row[11]) || 0,
        }))
      : [];

    return NextResponse.json({
      classes,
      batches,
      teachers,
      students,
      forms,
      responses,
    });
  } catch (err: any) {
    console.error('SQLite GET Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getSqliteDb();
    const body = await req.json();
    const { action, payload } = body;

    switch (action) {
      case 'admin_login': {
        const { username, password } = payload;
        const res = db.exec("SELECT password FROM admin_user WHERE username = ?", [username]);
        if (res.length > 0 && res[0].values.length > 0) {
          const storedPwd = res[0].values[0][0];
          if (storedPwd === password || (username === 'admin' && password === 'admin123')) {
            return NextResponse.json({ success: true });
          }
        }
        return NextResponse.json({ success: false, message: 'Invalid admin credentials' }, { status: 401 });
      }

      case 'save_class': {
        const { id, name, code, department, academicYear, description, createdAt } = payload;
        db.run(
          `INSERT OR REPLACE INTO classes (id, name, code, department, academicYear, description, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [id, name, code, department || '', academicYear || '', description || '', createdAt]
        );
        saveDatabase(db);
        return NextResponse.json({ success: true });
      }

      case 'delete_class': {
        const { id } = payload;
        db.run('DELETE FROM classes WHERE id = ?', [id]);
        db.run('DELETE FROM batches WHERE classId = ?', [id]);
        saveDatabase(db);
        return NextResponse.json({ success: true });
      }

      case 'save_batch': {
        const { id, classId, name, timing, roomNumber, maxCapacity, academicYear, createdAt } = payload;
        db.run(
          `INSERT OR REPLACE INTO batches (id, classId, name, timing, roomNumber, maxCapacity, academicYear, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, classId, name, timing || '', roomNumber || '', maxCapacity || 40, academicYear || '', createdAt]
        );
        saveDatabase(db);
        return NextResponse.json({ success: true });
      }

      case 'delete_batch': {
        const { id } = payload;
        db.run('DELETE FROM batches WHERE id = ?', [id]);
        saveDatabase(db);
        return NextResponse.json({ success: true });
      }

      case 'save_teacher': {
        const { id, employeeId, name, email, phone, subjectSpecialization, assignedBatchIds, status, createdAt } = payload;
        db.run(
          `INSERT OR REPLACE INTO teachers (id, employeeId, name, email, phone, subjectSpecialization, assignedBatchIds, status, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            employeeId,
            name,
            email || '',
            phone || '',
            JSON.stringify(subjectSpecialization || []),
            JSON.stringify(assignedBatchIds || []),
            status || 'active',
            createdAt,
          ]
        );
        saveDatabase(db);
        return NextResponse.json({ success: true });
      }

      case 'delete_teacher': {
        const { id } = payload;
        db.run('DELETE FROM teachers WHERE id = ?', [id]);
        saveDatabase(db);
        return NextResponse.json({ success: true });
      }

      case 'bulk_add_teachers': {
        const { teachers: list } = payload;
        if (Array.isArray(list)) {
          for (const t of list) {
            db.run(
              `INSERT OR REPLACE INTO teachers (id, employeeId, name, email, phone, subjectSpecialization, assignedBatchIds, status, createdAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                t.id,
                t.employeeId || '',
                t.name,
                t.email || '',
                t.phone || '',
                JSON.stringify(t.subjectSpecialization || []),
                JSON.stringify(t.assignedBatchIds || []),
                t.status || 'active',
                t.createdAt || new Date().toISOString(),
              ]
            );
          }
          saveDatabase(db);
        }
        return NextResponse.json({ success: true, count: list?.length || 0 });
      }

      case 'save_student': {
        const { id, studentId, name, dob, password, hasChangedPassword, batchId, createdAt } = payload;
        db.run(
          `INSERT OR REPLACE INTO students (id, studentId, name, dob, password, hasChangedPassword, batchId, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, studentId.toUpperCase(), name, dob, password || '', hasChangedPassword ? 1 : 0, batchId, createdAt]
        );
        saveDatabase(db);
        return NextResponse.json({ success: true });
      }

      case 'bulk_add_students': {
        const { students: newStudents } = payload;
        let addedCount = 0;
        let duplicateCount = 0;

        for (const s of newStudents) {
          const upperId = s.studentId.trim().toUpperCase();
          const check = db.exec('SELECT id FROM students WHERE studentId = ?', [upperId]);
          if (check.length > 0 && check[0].values.length > 0) {
            duplicateCount++;
          } else {
            db.run(
              `INSERT INTO students (id, studentId, name, dob, password, hasChangedPassword, batchId, createdAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [s.id, upperId, s.name, s.dob, '', 0, s.batchId, s.createdAt]
            );
            addedCount++;
          }
        }
        saveDatabase(db);
        return NextResponse.json({ success: true, addedCount, duplicateCount });
      }

      case 'delete_student': {
        const { id } = payload;
        db.run('DELETE FROM students WHERE id = ? OR studentId = ?', [id, id]);
        saveDatabase(db);
        return NextResponse.json({ success: true });
      }

      case 'update_student_password': {
        const { studentId, newPassword } = payload;
        db.run('UPDATE students SET password = ?, hasChangedPassword = 1 WHERE studentId = ?', [
          newPassword,
          studentId.toUpperCase(),
        ]);
        saveDatabase(db);
        return NextResponse.json({ success: true });
      }

      case 'save_form': {
        const { id, title, description, classId, batchId, teacherId, questions, status, expiresAt, shareableCode, createdAt } = payload;
        db.run(
          `INSERT OR REPLACE INTO feedback_forms (id, title, description, batchId, teacherId, questions, status, expiresAt, shareableCode, createdAt, classId)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            title,
            description || '',
            batchId || '',
            teacherId || null,
            JSON.stringify(questions || []),
            status || 'active',
            expiresAt || null,
            shareableCode,
            createdAt,
            classId || '',
          ]
        );
        saveDatabase(db);
        return NextResponse.json({ success: true });
      }

      case 'toggle_form_status': {
        const { id } = payload;
        const res = db.exec('SELECT status FROM feedback_forms WHERE id = ?', [id]);
        if (res.length > 0 && res[0].values.length > 0) {
          const curr = res[0].values[0][0] as string;
          const next = curr === 'active' ? 'closed' : 'active';
          db.run('UPDATE feedback_forms SET status = ? WHERE id = ?', [next, id]);
          saveDatabase(db);
          return NextResponse.json({ success: true, status: next });
        }
        return NextResponse.json({ success: false, message: 'Form not found' }, { status: 404 });
      }

      case 'delete_form': {
        const { id } = payload;
        db.run('DELETE FROM feedback_forms WHERE id = ?', [id]);
        db.run('DELETE FROM feedback_responses WHERE formId = ?', [id]);
        saveDatabase(db);
        return NextResponse.json({ success: true });
      }

      case 'submit_response': {
        const { formId, classId, batchId, studentId, studentName, answers, teacherId, totalScore, maxPossibleScore, scorePercentage } = payload;
        const cleanStudentId = (studentId || '').trim().toUpperCase();
        const safeTeacherId = teacherId || '';

        // Check if student has already submitted for this teacher (or form)
        const check = safeTeacherId
          ? db.exec(
              'SELECT id FROM feedback_responses WHERE formId = ? AND studentId = ? AND teacherId = ?',
              [formId, cleanStudentId, safeTeacherId]
            )
          : db.exec(
              'SELECT id FROM feedback_responses WHERE formId = ? AND studentId = ?',
              [formId, cleanStudentId]
            );

        if (check.length > 0 && check[0].values.length > 0) {
          return NextResponse.json(
            { success: false, message: 'You have already submitted feedback for this faculty member.' },
            { status: 409 }
          );
        }

        const id = `resp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const submittedAt = new Date().toISOString();

        db.run(
          `INSERT INTO feedback_responses (id, formId, batchId, studentId, studentName, teacherId, answers, submittedAt, classId, totalScore, maxPossibleScore, scorePercentage)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            formId,
            batchId || '',
            cleanStudentId,
            studentName || 'Student',
            safeTeacherId,
            JSON.stringify(answers || {}),
            submittedAt,
            classId || '',
            Number(totalScore) || 0,
            Number(maxPossibleScore) || 0,
            Number(scorePercentage) || 0,
          ]
        );
        saveDatabase(db);
        return NextResponse.json({ success: true, id });
      }

      case 'clear_all_data': {
        db.run('DELETE FROM classes');
        db.run('DELETE FROM batches');
        db.run('DELETE FROM teachers');
        db.run('DELETE FROM students');
        db.run('DELETE FROM feedback_forms');
        db.run('DELETE FROM feedback_responses');
        saveDatabase(db);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (err: any) {
    console.error('SQLite POST Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
