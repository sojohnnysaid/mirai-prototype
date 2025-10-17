'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { toggleSidebar } from '@/store/slices/uiSlice';
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
  const dispatch = useDispatch();
  const { sidebarOpen } = useSelector((state: RootState) => state.ui);
  const [showText, setShowText] = useState(sidebarOpen);

  useEffect(() => {
    if (sidebarOpen) {
      const timer = setTimeout(() => setShowText(true), 50);
      return () => clearTimeout(timer);
    } else {
      setShowText(false);
    }
  }, [sidebarOpen]);

  return (
    <aside className={`sidebar ${!sidebarOpen ? 'collapsed' : ''}`}>
      <button 
        onClick={() => router.push('/dashboard')}
        className="sidebar-header cursor-pointer"
      >
        <div className="sidebar-avatar">
          <span className="text-white font-bold text-sm">M</span>
        </div>
        <span className={`sidebar-brand ${showText ? 'animate-fadeIn' : 'animate-fadeOut'}`}>
          Mirai
        </span>
      </button>

      <button
        onClick={() => dispatch(toggleSidebar())}
        className="sidebar-toggle"
      >
        {sidebarOpen ? (
          <ChevronLeft className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>

      <nav className="sidebar-menu">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`menu-item ${isActive ? 'active' : ''}`}
            >
              <Icon className="menu-icon" />
              <span className={`menu-label ${showText ? 'animate-fadeIn' : 'animate-fadeOut'}`}>
                {item.label}
              </span>
            </button>
          );
        })}

        {showText && (
          <div className={`sidebar-recents ${showText ? 'animate-fadeIn' : 'animate-fadeOut'}`}>
            <h3 className="recents-title">Recents</h3>
            {recentItems.map((item) => (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className="recent-item"
              >
                <div className="recent-dot" />
                <span className="menu-label">{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </nav>

      <div className="sidebar-bottom">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className="menu-item"
            >
              <Icon className="menu-icon" />
              <span className={`menu-label ${showText ? 'animate-fadeIn' : 'animate-fadeOut'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
