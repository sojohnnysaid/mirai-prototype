'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  Settings,
  HelpCircle,
  Bell,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const menuItems = [
  { icon: LayoutDashboard, label: 'Content Library', path: '/content-library' },
  { icon: FileText, label: 'Templates', path: '/templates' },
  { icon: BookOpen, label: 'Tutorials', path: '/tutorials' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

const recentItems = [
  { label: 'Team Folder 1', path: '/folder/team-1' },
  { label: 'Team Folder 2', path: '/folder/team-2' },
];

const bottomItems = [
  { icon: HelpCircle, label: 'Help and Support', path: '/help' },
  { icon: Bell, label: 'Product Updates', path: '/updates' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarOpen } = useSelector((state: RootState) => state.ui);

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-white border-r border-gray-200 transition-all duration-300 z-40 ${
        sidebarOpen ? 'w-64' : 'w-20'
      }`}
    >
      <div className="flex flex-col h-full p-4">
        {/* Toggle Button */}
        <div className="flex items-center justify-between mb-6">
          <div className={`flex items-center gap-2 ${!sidebarOpen && 'justify-center w-full'}`}>
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            {sidebarOpen && <span className="font-semibold text-gray-900">Mirai</span>}
          </div>
        </div>

        {/* Arrow Toggle */}
        <button
          onClick={() => {}}
          className="absolute top-8 -right-3 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50"
        >
          {sidebarOpen ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        {/* Main Menu */}
        <nav className="flex-1 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`sidebar-link w-full ${isActive ? 'active' : ''} ${
                  !sidebarOpen && 'justify-center'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}

          {sidebarOpen && (
            <>
              <div className="pt-6 pb-2">
                <h3 className="px-4 text-sm font-semibold text-gray-500">Recents</h3>
              </div>
              {recentItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className="sidebar-link w-full"
                >
                  <div className="w-5 h-5 rounded-full bg-gray-300 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              ))}
            </>
          )}
        </nav>

        {/* Bottom Items */}
        <div className="border-t border-gray-200 pt-4 space-y-1">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`sidebar-link w-full ${!sidebarOpen && 'justify-center'}`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="text-sm">{item.label}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
