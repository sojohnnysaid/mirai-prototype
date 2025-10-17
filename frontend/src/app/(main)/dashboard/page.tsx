'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import DashboardCard from '@/components/dashboard/DashboardCard';
import { Sparkles, Upload } from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();

  return (
    <>
      <div className="bg-gray-200 rounded-2xl p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900">WHATS NEW BANNER</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <DashboardCard
          title="Prompt-Based Course Builder"
          description="Start your first course design using prompts."
          icon={<Sparkles className="w-8 h-8 text-primary-600" />}
          onClick={() => router.push('/course-builder')}
        />
        <DashboardCard
          title="Import Document/Video"
          description="Import PDF, DOCX, MP4 file to start your development process"
          icon={<Upload className="w-8 h-8 text-primary-600" />}
          onClick={() => {}}
        />
      </div>

      <div className="bg-gray-100 rounded-2xl p-6">
        <div className="flex gap-4 mb-4">
          <button className="px-6 py-2 bg-primary-300 rounded-lg font-medium">
            Recent
          </button>
          <button className="px-6 py-2 bg-primary-400 rounded-lg font-medium">
            Drafts
          </button>
        </div>

        <div className="bg-white rounded-lg p-8 min-h-[200px] flex items-center justify-center">
          <p className="text-gray-400">No recent items</p>
        </div>
      </div>
    </>
  );
}

