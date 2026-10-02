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
  dob?: string;
  password?: string;
  hasChangedPassword?: boolean;
  batchId?: string;
  classId?: string;
  createdAt: string;
}

export type QuestionType = 'multiple_choice' | 'text';

export interface QuestionOption {
  id: string;
  text: string;
  score: number; // Numeric marks for this choice (e.g. 10, 8, 5, 2)
}

export interface FeedbackQuestion {
  id: string;
  text: string;
  type: QuestionType;
  options?: QuestionOption[]; // 4 options with scores
  required: boolean;
  teacherId?: string; // Optional: evaluate specific teacher
}

export interface FeedbackForm {
  id: string;
  title: string;
  description: string;
  classId: string; // Associated class
  batchId: string; // Specific batch or 'all'
  questions: FeedbackQuestion[];
  status: 'active' | 'closed';
  expiresAt?: string;
  shareableCode: string;
  createdAt: string;
}

export interface FeedbackResponse {
  id: string;
  formId: string;
  classId?: string;
  batchId?: string;
  studentId: string;
  studentName: string;
  teacherId?: string; // Specific teacher evaluated
  answers: Record<string, string | number>;
  totalScore?: number; // Total points awarded by this student
  maxPossibleScore?: number; // Max points possible for this submission
  scorePercentage?: number; // (totalScore / maxPossibleScore) * 100
  submittedAt: string;
}

export type ActiveTab = 'overview' | 'classes' | 'teachers' | 'students' | 'feedback' | 'reports';

export interface BulkStudentRow {
  studentId: string;
  name: string;
  dob?: string;
  isValid: boolean;
  error?: string;
}

export interface BulkTeacherRow {
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  subjects: string;
  isValid: boolean;
  error?: string;
}
