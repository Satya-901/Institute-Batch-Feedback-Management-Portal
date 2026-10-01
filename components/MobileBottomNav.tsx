'use client';

import React from 'react';
import {
  LayoutDashboard,
  Layers,
  ClipboardList,
  GraduationCap,
  BarChart3,
  Users2,
} from 'lucide-react';
import { ActiveTab } from '@/types';

interface MobileBottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  formsCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  formsCount,
}) => {
  const items = [
    { id: 'overview' as ActiveTab, label: 'Home', icon: LayoutDashboard },
    { id: 'classes' as ActiveTab, label: 'Batches', icon: Layers },
    { id: 'feedback' as ActiveTab, label: 'Feedback', icon: ClipboardList, badge: formsCount },
    { id: 'students' as ActiveTab, label: 'Students', icon: GraduationCap },
    { id: 'teachers' as ActiveTab, label: 'Faculty', icon: Users2 },
    { id: 'reports' as ActiveTab, label: 'Reports', icon: BarChart3 },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 text-slate-300 md:hidden px-2 py-1 shadow-2xl">
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center py-1.5 px-2 rounded-lg transition-all ${
                isActive ? 'text-teal-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 bg-teal-500 text-slate-900 text-[10px] font-bold px-1 rounded-full leading-tight">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-0 w-8 h-0.5 bg-teal-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
