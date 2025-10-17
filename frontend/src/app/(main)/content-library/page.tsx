'use client';

import React, { useState } from 'react';
import { mockFolders } from '@/lib/mockData';
import { ChevronDown, ChevronRight, Folder, Search } from 'lucide-react';

export default function ContentLibrary() {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['hr']));
  const [viewMode, setViewMode] = useState<'folder' | 'tag'>('folder');

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      next.has(folderId) ? next.delete(folderId) : next.add(folderId);
      return next;
    });
  };

  const renderFolder = (folder: any, level = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const hasChildren = folder.children?.length > 0;

    return (
      <div key={folder.id} style={{ marginLeft: `${level * 20}px` }}>
        <div
          className="flex items-center gap-2 py-2 px-3 hover:bg-gray-100 rounded-lg cursor-pointer"
          onClick={() => hasChildren && toggleFolder(folder.id)}
        >
          {hasChildren && (
            <span className="text-gray-600">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </span>
          )}
          <Folder className="w-5 h-5 text-gray-600" />
          <span className="font-medium text-gray-900">{folder.name}</span>
        </div>

        {isExpanded &&
          hasChildren &&
          folder.children.map((child: any) => renderFolder(child, level + 1))}
      </div>
    );
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Content Library</h1>
          <p className="text-gray-600">Browse and organize all your content</p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-6">
        {/* Left: Folder Sidebar */}
        <div className="w-80 bg-primary-50 border border-gray-200 rounded-2xl p-4 h-[calc(100vh-200px)] overflow-y-auto">
          <div className="space-y-3 mb-6">
            <button
              className={`w-full text-left px-4 py-2 rounded-lg font-medium ${
                viewMode === 'folder'
                  ? 'bg-white text-gray-900'
                  : 'bg-primary-100 hover:bg-primary-200 text-gray-700'
              }`}
              onClick={() => setViewMode('folder')}
            >
              Folder View
            </button>
            <button
              className={`w-full text-left px-4 py-2 rounded-lg font-medium ${
                viewMode === 'tag'
                  ? 'bg-white text-gray-900'
                  : 'bg-primary-100 hover:bg-primary-200 text-gray-700'
              }`}
              onClick={() => setViewMode('tag')}
            >
              Tag/Category View
            </button>
          </div>

          <div className="space-y-2">{mockFolders.map((f) => renderFolder(f))}</div>
        </div>

        {/* Right: Main Content */}
        <div className="flex-1 bg-white border border-gray-200 rounded-2xl p-6">
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none">
              <option>Owner</option>
            </select>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none">
              <option>Tags</option>
            </select>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none">
              <option>Modified Date</option>
            </select>
          </div>

          <div className="border-b border-gray-300 pb-3 mb-6 grid grid-cols-4 gap-4 font-semibold text-gray-900">
            <div>Name</div>
            <div>Owner</div>
            <div>Tags</div>
            <div>Modified Date</div>
          </div>

          <div className="flex-1 flex items-center justify-center h-64">
            <div className="text-center text-gray-400">
              <Folder className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">No content in this folder</p>
              <p className="text-sm">Select a folder to view its contents</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

