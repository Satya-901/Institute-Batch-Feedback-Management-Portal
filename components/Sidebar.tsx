'use client';

import React from 'react';
import {
  LayoutDashboard,
  Layers,
  Users2,
  GraduationCap,
  ClipboardList,
  BarChart3,
  UserPlus,
  Plus,
} from 'lucide-react';
import { ActiveTab } from '@/types';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  classesCount: number;
  batchesCount: number;
  teachersCount: number;
  studentsCount: number;
  formsCount: number;
  responsesCount: number;
  onQuickAction: (action: 'add_class' | 'add_batch' | 'add_teacher' | 'bulk_students' | 'create_form') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  classesCount,
  batchesCount,
  teachersCount,
  studentsCount,
  formsCount,
  responsesCount,
  onQuickAction,
}) => {
  const navItems = [
    {
      id: 'overview' as ActiveTab,
      label: 'Overview',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'classes' as ActiveTab,
      label: 'Classes & Batches',
      icon: Layers,
      badge: batchesCount > 0 ? batchesCount : null,
    },
    {
      id: 'teachers' as ActiveTab,
      label: 'Faculty',
      icon: Users2,
      badge: teachersCount > 0 ? teachersCount : null,
    },
    {
      id: 'students' as ActiveTab,
      label: 'Students',
      icon: GraduationCap,
      badge: studentsCount > 0 ? studentsCount : null,
    },
    {
      id: 'feedback' as ActiveTab,
      label: 'Feedback Forms',
      icon: ClipboardList,
      badge: formsCount > 0 ? formsCount : null,
    },
    {
      id: 'reports' as ActiveTab,
      label: 'Reports',
      icon: BarChart3,
      badge: responsesCount > 0 ? responsesCount : null,
    },
  ];

  return (
    <aside className="w-56 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col justify-between shrink-0 hidden md:flex">
      <div className="p-3 space-y-4">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== null && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      isActive
                        ? 'bg-teal-700 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Quick action shortcuts */}
        <div className="pt-3 border-t border-slate-800/80 space-y-1.5">
          <button
            onClick={() => onQuickAction('bulk_students')}
            className="w-full flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-300 hover:bg-slate-800 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Enrol Students</span>
          </button>
          <button
            onClick={() => onQuickAction('create_form')}
            className="w-full flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium text-teal-300 hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Feedback Form</span>
          </button>
        </div>
      </div>

      <div className="p-3 border-t border-slate-800/80 text-[11px] text-slate-500 font-mono">
        EduPulse • SQLite
      </div>
    </aside>
  );
};
