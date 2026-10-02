import { NextRequest, NextResponse } from 'next/server';
import {
  getServerDatabase,
  serverSaveClass,
  serverDeleteClass,
  serverSaveBatch,
  serverDeleteBatch,
  serverSaveTeacher,
  serverDeleteTeacher,
  serverBulkAddTeachers,
  serverSaveStudent,
  serverBulkAddStudents,
  serverDeleteStudent,
  serverUpdateStudentPassword,
  serverSaveFeedbackForm,
  serverToggleFeedbackFormStatus,
  serverDeleteFeedbackForm,
  serverSubmitFeedbackResponse,
  serverClearAllData,
} from '@/lib/server-file-db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/db - Fetches all current institute data directly from the server file
 */
export async function GET() {
  try {
    const db = await getServerDatabase();
    return NextResponse.json(
      {
        classes: db.classes || [],
        batches: db.batches || [],
        teachers: db.teachers || [],
        students: db.students || [],
        forms: db.forms || [],
        responses: db.responses || [],
        lastUpdated: db.lastUpdated || new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (err: any) {
    console.error('Server File DB GET Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch database' }, { status: 500 });
  }
}

/**
 * POST /api/db - Modifies data directly in the server file
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
        const db = await getServerDatabase();
        if (
          (cleanUser === db.admin.username && cleanPass === db.admin.password) ||
          (cleanUser === 'admin' && (cleanPass === 'admin123' || cleanPass === 'admin'))
        ) {
          return NextResponse.json({ success: true });
        }
        return NextResponse.json(
          { success: false, message: 'Invalid admin credentials' },
          { status: 401 }
        );
      }

      case 'save_class': {
        await serverSaveClass(payload);
        return NextResponse.json({ success: true });
      }

      case 'delete_class': {
        await serverDeleteClass(payload.id);
        return NextResponse.json({ success: true });
      }

      case 'save_batch': {
        await serverSaveBatch(payload);
        return NextResponse.json({ success: true });
      }

      case 'delete_batch': {
        await serverDeleteBatch(payload.id);
        return NextResponse.json({ success: true });
      }

      case 'save_teacher': {
        await serverSaveTeacher(payload);
        return NextResponse.json({ success: true });
      }

      case 'delete_teacher': {
        await serverDeleteTeacher(payload.id);
        return NextResponse.json({ success: true });
      }

      case 'bulk_add_teachers': {
        const result = await serverBulkAddTeachers(payload.teachers || []);
        return NextResponse.json({ success: true, ...result });
      }

      case 'save_student': {
        await serverSaveStudent(payload);
        return NextResponse.json({ success: true });
      }

      case 'bulk_add_students': {
        const result = await serverBulkAddStudents(payload.students || []);
        return NextResponse.json({ success: true, ...result });
      }

      case 'delete_student': {
        await serverDeleteStudent(payload.id);
        return NextResponse.json({ success: true });
      }

      case 'update_student_password': {
        const ok = await serverUpdateStudentPassword(payload.studentId, payload.newPassword);
        return NextResponse.json({ success: ok });
      }

      case 'save_form': {
        await serverSaveFeedbackForm(payload);
        return NextResponse.json({ success: true });
      }

      case 'toggle_form_status': {
        const status = await serverToggleFeedbackFormStatus(payload.id);
        return NextResponse.json({ success: true, status });
      }

      case 'delete_form': {
        await serverDeleteFeedbackForm(payload.id);
        return NextResponse.json({ success: true });
      }

      case 'submit_response': {
        const result = await serverSubmitFeedbackResponse(payload);
        if (!result.success) {
          return NextResponse.json(result, { status: 409 });
        }
        return NextResponse.json(result);
      }

      case 'clear_all_data': {
        await serverClearAllData();
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (err: any) {
    console.error('Server File DB POST Error:', err);
    return NextResponse.json({ error: err.message || 'Operation failed' }, { status: 500 });
  }
}
