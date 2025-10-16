'use client';

import React from 'react';
import { Menu } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { toggleSidebar } from '@/store/slices/uiSlice';

interface HeaderProps {
  title?: string;
}

export default function Header({ title = 'MIRAI LOGO AND BRANDING' }: HeaderProps) {
  const dispatch = useDispatch();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      </div>
    </header>
  );
}
