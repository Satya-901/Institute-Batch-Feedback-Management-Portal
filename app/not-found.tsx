import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <span className="inline-block text-[11px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 font-bold">
          401 Unauthorized / Not Found
        </span>

        <h1 className="text-xl font-bold text-slate-900">Unauthorized Access</h1>
        <p className="text-xs text-slate-600">
          The path you attempted to access is restricted, unauthorized, or does not exist.
        </p>

        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Student Feedback Portal</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
