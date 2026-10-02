import { NextRequest, NextResponse } from 'next/server';
import {
  getAllData,
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
} from '@/lib/sqlite-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/db - Fetches all current institute data directly from server SQLite database
 */
export async function GET() {
  try {
    const data = await getAllData();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (err: any) {
    console.error('Server SQLite DB GET Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch database' }, { status: 500 });
  }
}

/**
 * POST /api/db - Modifies data directly in the server SQLite database file
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    switch (action) {
      case 'admin_login': {
        const { username, password } = payload || {};
        const cleanUser = (username || '').trim().toLowerCase();
        const cleanPass = (password || '').trim();
        const envUser = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
        const envPass = (process.env.ADMIN_PASSWORD || '').trim();

        const isEnvMatch = Boolean(envPass && cleanUser === envUser && cleanPass === envPass);

        // Also check if admin credentials exist in SQLite admin_user table
        const db = await getSqliteDb();
        const stmt = db.prepare('SELECT password FROM admin_user WHERE LOWER(username) = ?');
        stmt.bind([cleanUser]);
        let isDbMatch = false;
        if (stmt.step()) {
          const row = stmt.getAsObject() as { password?: string };
          if (row.password && row.password === cleanPass) {
            isDbMatch = true;
          }
        }
        stmt.free();

        if (isEnvMatch || isDbMatch) {
          return NextResponse.json({ success: true });
        }
        return NextResponse.json(
          { success: false, message: 'Invalid admin credentials' },
          { status: 401 }
        );
      }

      case 'save_class': {
        await sqliteSaveClass(payload);
        return NextResponse.json({ success: true });
      }

      case 'delete_class': {
        await sqliteDeleteClass(payload.id);
        return NextResponse.json({ success: true });
      }

      case 'save_batch': {
        await sqliteSaveBatch(payload);
        return NextResponse.json({ success: true });
      }

      case 'delete_batch': {
        await sqliteDeleteBatch(payload.id);
        return NextResponse.json({ success: true });
      }

      case 'save_teacher': {
        await sqliteSaveTeacher(payload);
        return NextResponse.json({ success: true });
      }

      case 'delete_teacher': {
        await sqliteDeleteTeacher(payload.id);
        return NextResponse.json({ success: true });
      }

      case 'bulk_add_teachers': {
        const result = await sqliteBulkAddTeachers(payload.teachers || []);
        return NextResponse.json({ success: true, ...result });
      }

      case 'save_student': {
        await sqliteSaveStudent(payload);
        return NextResponse.json({ success: true });
      }

      case 'bulk_add_students': {
        const result = await sqliteBulkAddStudents(payload.students || []);
        return NextResponse.json({ success: true, ...result });
      }

      case 'delete_student': {
        await sqliteDeleteStudent(payload.id);
        return NextResponse.json({ success: true });
      }

      case 'update_student_password': {
        const ok = await sqliteUpdateStudentPassword(payload.studentId, payload.newPassword);
        return NextResponse.json({ success: ok });
      }

      case 'save_form': {
        await sqliteSaveFeedbackForm(payload);
        return NextResponse.json({ success: true });
      }

      case 'toggle_form_status': {
        const status = await sqliteToggleFeedbackFormStatus(payload.id);
        return NextResponse.json({ success: true, status });
      }

      case 'delete_form': {
        await sqliteDeleteFeedbackForm(payload.id);
        return NextResponse.json({ success: true });
      }

      case 'submit_response': {
        const result = await sqliteSubmitFeedbackResponse(payload);
        if (!result.success) {
          return NextResponse.json(result, { status: 409 });
        }
        return NextResponse.json(result);
      }

      case 'clear_all_data': {
        await sqliteClearAllData();
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (err: any) {
    console.error('Server SQLite DB POST Error:', err);
    return NextResponse.json({ error: err.message || 'Operation failed' }, { status: 500 });
  }
}
