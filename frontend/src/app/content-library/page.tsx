'use client';

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { mockFolders } from '@/lib/mockData';
import { ChevronDown, ChevronRight, Folder, Search } from 'lucide-react';

export default function ContentLibrary() {
  const { sidebarOpen } = useSelector((state: RootState) => state.ui);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['hr']));
  const [viewMode, setViewMode] = useState<'folder' | 'tag'>('folder');

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const renderFolder = (folder: any, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const hasChildren = folder.children && folder.children.length > 0;

    return (
      <div key={folder.id} style={{ marginLeft: `${level * 20}px` }}>
        <div
          className="flex items-center gap-2 py-2 px-3 hover:bg-gray-100 rounded-lg cursor-pointer"
          onClick={() => hasChildren && toggleFolder(folder.id)}
        >
          {hasChildren && (
            <span className="text-gray-600">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </span>
          )}
          <Folder className="w-5 h-5 text-gray-600" />
          <span className="font-medium text-gray-900">{folder.name}</span>
        </div>

        {isExpanded && hasChildren && (
          <div>
            {folder.children.map((child: any) => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        <Header />
        
        <div className="flex h-[calc(100vh-73px)]">
          {/* Left Panel - Folder Tree */}
          <div className="w-96 bg-primary-100 border-r border-gray-200 p-6 overflow-y-auto">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setViewMode('folder')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    viewMode === 'folder'
                      ? 'bg-white text-gray-900'
                      : 'bg-primary-200 text-gray-700'
                  }`}
                >
                  VIEW
                </button>
                <ChevronDown className="w-5 h-5 text-gray-600" />
              </div>

              <div className="space-y-1">
                <button
                  className={`w-full text-left px-4 py-2 rounded-lg font-medium transition-colors ${
                    viewMode === 'folder'
                      ? 'bg-white text-gray-900'
                      : 'hover:bg-primary-200'
                  }`}
                  onClick={() => setViewMode('folder')}
                >
                  Folder
                </button>
                <button
                  className={`w-full text-left px-4 py-2 rounded-lg font-medium transition-colors ${
                    viewMode === 'tag'
                      ? 'bg-white text-gray-900'
                      : 'hover:bg-primary-200'
                  }`}
                  onClick={() => setViewMode('tag')}
                >
                  Tag/Category
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {mockFolders.map((folder) => renderFolder(folder))}
            </div>
          </div>

          {/* Right Panel - Content Area */}
          <div className="flex-1 bg-white p-6 overflow-y-auto">
            <div className="mb-6">
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none">
                    <option>Owner</option>
                  </select>
                </div>
                <div>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none">
                    <option>Tags</option>
                  </select>
                </div>
                <div>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none">
                    <option>Modified Date</option>
                  </select>
                </div>
              </div>

              <div className="border-b border-gray-300">
                <div className="grid grid-cols-4 gap-4 pb-3">
                  <div className="font-semibold text-gray-900">Name</div>
                  <div className="font-semibold text-gray-900">Owner</div>
                  <div className="font-semibold text-gray-900">Tags</div>
                  <div className="font-semibold text-gray-900">Modified Date</div>
                </div>
              </div>
            </div>

            {/* Empty State */}
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Folder className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No content in this folder</p>
                <p className="text-gray-400 text-sm">Select a folder to view its contents</p>
              </div>
            </div>

            {/* Example rows - these would be populated with actual data */}
            <div className="space-y-4 hidden">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="border-b border-gray-200 pb-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-gray-900">Course Title {i}</div>
                    <div className="text-gray-600">John Doe</div>
                    <div className="flex gap-2">
                      <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-sm">
                        Tag1
                      </span>
                      <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-sm">
                        Tag2
                      </span>
                    </div>
                    <div className="text-gray-600">Oct 15, 2024</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
