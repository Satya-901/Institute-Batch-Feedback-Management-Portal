export interface ClassItem {
  id: string;
  name: string;
  code: string;
  department: string;
  academicYear: string;
  description?: string;
  createdAt: string;
}

export interface BatchItem {
  id: string;
  classId: string;
  name: string;
  timing: string;
  roomNumber?: string;
  maxCapacity: number;
  academicYear: string;
  createdAt: string;
}

export interface TeacherItem {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  subjectSpecialization: string[];
  assignedBatchIds: string[];
  status: 'active' | 'on_leave';
  createdAt: string;
}

export interface StudentItem {
  id: string;
  studentId: string;
  name: string;
  dob: string; // Used as initial password e.g. YYYY-MM-DD
  password?: string; // If student changed password
  hasChangedPassword?: boolean;
  batchId: string;
  createdAt: string;
}

export type QuestionType = 'rating' | 'multiple_choice' | 'text' | 'yes_no';

export interface FeedbackQuestion {
  id: string;
  text: string;
  type: QuestionType;
  scaleMax?: number; // 3, 5, or 10 for rating
  scaleLabels?: {
    min: string;
    max: string;
  };
  options?: string[]; // for multiple_choice
  required: boolean;
  teacherId?: string; // Optional: evaluate specific teacher
}

export interface FeedbackForm {
  id: string;
  title: string;
  description: string;
  batchId: string;
  teacherId?: string; // Optional: evaluate specific teacher or general batch
  questions: FeedbackQuestion[];
  status: 'active' | 'closed';
  expiresAt?: string;
  shareableCode: string;
  createdAt: string;
}

export interface FeedbackResponse {
  id: string;
  formId: string;
  batchId: string;
  studentId: string;
  studentName: string;
  teacherId?: string; // Optional: which teacher this response was for
  answers: Record<string, number | string | string[]>;
  submittedAt: string;
}

export type ActiveTab = 'overview' | 'classes' | 'teachers' | 'students' | 'feedback' | 'reports';

export interface BulkStudentRow {
  studentId: string;
  name: string;
  dob: string;
  isValid: boolean;
  error?: string;
}
