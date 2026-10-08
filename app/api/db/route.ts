import { NextRequest, NextResponse } from 'next/server';
import {
  getAllData,
  saveClass,
  deleteClass,
  saveBatch,
  deleteBatch,
  saveTeacher,
  deleteTeacher,
  bulkAddTeachers,
  saveStudent,
  bulkAddStudents,
  deleteStudent,
  updateStudentPassword,
  saveFeedbackForm,
  toggleFeedbackFormStatus,
  deleteFeedbackForm,
  submitFeedbackResponse,
  clearAllData,
  checkAdminLogin,
  saveFormTemplate,
  deleteFormTemplate,
} from '@/lib/db-manager';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/db - Fetches all current institute data
 * Uses MySQL if available, falls back to SQLite automatically
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
    console.error('Database GET Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch database' }, { status: 500 });
  }
}

/**
 * POST /api/db - Modifies data directly in MySQL with dual-write to SQLite fallback
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, payload } = body;

    switch (action) {
      case 'admin_login': {
        const { username, password } = payload || {};
        const isAuth = await checkAdminLogin(username, password);

        if (isAuth) {
          return NextResponse.json({ success: true });
        }
        return NextResponse.json(
          { success: false, message: 'Invalid admin credentials' },
          { status: 401 }
        );
      }

      case 'save_class': {
        await saveClass(payload);
        return NextResponse.json({ success: true });
      }

      case 'delete_class': {
        await deleteClass(payload.id);
        return NextResponse.json({ success: true });
      }

      case 'save_batch': {
        await saveBatch(payload);
        return NextResponse.json({ success: true });
      }

      case 'delete_batch': {
        await deleteBatch(payload.id);
        return NextResponse.json({ success: true });
      }

      case 'save_teacher': {
        await saveTeacher(payload);
        return NextResponse.json({ success: true });
      }

      case 'delete_teacher': {
        await deleteTeacher(payload.id);
        return NextResponse.json({ success: true });
      }

      case 'bulk_add_teachers': {
        const result = await bulkAddTeachers(payload.teachers || []);
        return NextResponse.json({ success: true, ...result });
      }

      case 'save_student': {
        await saveStudent(payload);
        return NextResponse.json({ success: true });
      }

      case 'bulk_add_students': {
        const result = await bulkAddStudents(payload.students || []);
        return NextResponse.json({ success: true, ...result });
      }

      case 'delete_student': {
        await deleteStudent(payload.id);
        return NextResponse.json({ success: true });
      }

      case 'update_student_password': {
        const ok = await updateStudentPassword(payload.studentId, payload.newPassword);
        return NextResponse.json({ success: ok });
      }

      case 'save_form': {
        await saveFeedbackForm(payload);
        return NextResponse.json({ success: true });
      }

      case 'toggle_form_status': {
        const status = await toggleFeedbackFormStatus(payload.id);
        return NextResponse.json({ success: true, status });
      }

      case 'delete_form': {
        await deleteFeedbackForm(payload.id);
        return NextResponse.json({ success: true });
      }

      case 'submit_response': {
        const result = await submitFeedbackResponse(payload);
        if (!result.success) {
          return NextResponse.json(result, { status: 409 });
        }
        return NextResponse.json(result);
      }

      case 'clear_all_data': {
        await clearAllData();
        return NextResponse.json({ success: true });
      }

      case 'save_template': {
        await saveFormTemplate(payload);
        return NextResponse.json({ success: true });
      }

      case 'delete_template': {
        await deleteFormTemplate(payload.id);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (err: any) {
    console.error('Database POST Error:', err);
    return NextResponse.json({ error: err.message || 'Operation failed' }, { status: 500 });
  }
}
