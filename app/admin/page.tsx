'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect directly to admin mode
    router.replace('/?admin=true');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-sm">
      <div className="flex flex-col items-center space-y-3">
        <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-300 text-xs">Opening EduPulse Administration...</p>
      </div>
    </div>
  );
}
