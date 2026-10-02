'use client';

import React from 'react';
import {
  School,
  LogOut,
  Database,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';
import { toastInfo } from '@/lib/notification';

interface NavbarProps {
  isAdmin: boolean;
  onLogout: () => void;
  onRefreshData?: () => void;
  studentMode?: boolean;
  onExitStudentMode?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isAdmin,
  onLogout,
  studentMode,
  onExitStudentMode,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 text-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo & Institute Identity */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white shadow-inner font-bold">
              <School className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-base text-slate-100">
                EduPulse
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs text-slate-400">
                {studentMode ? 'Student Portal' : 'Administration'}
              </span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-3">
            {isAdmin && !studentMode ? (
              <div className="flex items-center space-x-2">
                <span className="hidden md:inline-flex items-center space-x-1 text-xs text-slate-300 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
                  <Shield className="w-3 h-3 text-teal-400" />
                  <span>Admin</span>
                </span>
                <button
                  onClick={onLogout}
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};
