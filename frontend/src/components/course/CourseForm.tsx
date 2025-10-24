'use client';

import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { setCourseField } from '@/store/slices/courseSlice';
import Input from '@/components/ui/Input';
import FolderSelectionModal from './FolderSelectionModal';
import TagsSelectionModal from './TagsSelectionModal';
import DataSourceModal from './DataSourceModal';
import { Folder, Plus, X, Hash, Database, Info } from 'lucide-react';

export default function CourseForm() {
  const dispatch = useDispatch();
  const { currentCourse } = useSelector((state: RootState) => state.course);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [isDataSourceModalOpen, setIsDataSourceModalOpen] = useState(false);

  const handleChange = (field: string, value: string | string[]) => {
    dispatch(setCourseField({ field, value }));
  };

  const handleFolderSelect = (folderName: string) => {
    handleChange('destinationFolder', folderName);
  };

  const handleTagsChange = (tags: string[]) => {
    handleChange('categoryTags', tags);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updatedTags = (currentCourse.categoryTags || []).filter(tag => tag !== tagToRemove);
    handleChange('categoryTags', updatedTags);
  };

  const handleDataSourceSelect = (source: string) => {
    handleChange('dataSource', source);
  };

  const getDataSourceDisplay = (sourceId: string | undefined) => {
    const sourceNames: { [key: string]: string } = {
      'open-web': 'Open Web Search',
      'curated-web': 'Curated Web Sources',
      'pdf-upload': 'PDF Documents',
      'video-upload': 'Video Content',
      'document-upload': 'Office Documents',
      'google-drive': 'Google Drive',
      'sharepoint': 'SharePoint',
      'confluence': 'Confluence',
      'local-storage': 'Local Knowledge Base'
    };
    return sourceId ? sourceNames[sourceId] || sourceId : null;
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Course Title
        </label>
        <input
          type="text"
          value={currentCourse.title || ''}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="eg: Objection Handling and Discovery Best Practices"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Learning Goal
        </label>
        <textarea
          value={currentCourse.desiredOutcome || ''}
          onChange={(e) => handleChange('desiredOutcome', e.target.value)}
          placeholder="Describe the learning goal and desired outcomes for this course"
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Destination Folder
          </label>
          <button
            type="button"
            onClick={() => setIsFolderModalOpen(true)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <span className={currentCourse.destinationFolder ? 'text-gray-900' : 'text-gray-400'}>
              {currentCourse.destinationFolder || 'Select a folder'}
            </span>
            <Folder className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tags
          </label>
          <div className="w-full min-h-[42px] px-3 py-1.5 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent">
            <div className="flex flex-wrap items-center gap-2">
              {currentCourse.categoryTags?.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium"
                >
                  <Hash className="w-3 h-3" />
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-0.5 hover:bg-primary-200 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => setIsTagsModalOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full text-sm font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add tags
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
            Data Source
            <button
              type="button"
              className="p-0.5 hover:bg-gray-100 rounded-full group relative"
              onClick={(e) => e.preventDefault()}
            >
              <Info className="w-3.5 h-3.5 text-gray-400" />
              <div className="absolute left-0 top-6 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50">
                Select where AI will gather information for your course
                <div className="absolute -top-1 left-2 w-2 h-2 bg-gray-900 rotate-45"></div>
              </div>
            </button>
          </label>
          <button
            type="button"
            onClick={() => setIsDataSourceModalOpen(true)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <span className={currentCourse.dataSource ? 'text-gray-900' : 'text-gray-400'}>
              {getDataSourceDisplay(currentCourse.dataSource) || 'Select data source'}
            </span>
            <Database className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Folder Selection Modal */}
      <FolderSelectionModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onSelect={handleFolderSelect}
        selectedFolder={currentCourse.destinationFolder}
      />

      {/* Tags Selection Modal */}
      <TagsSelectionModal
        isOpen={isTagsModalOpen}
        onClose={() => setIsTagsModalOpen(false)}
        selectedTags={currentCourse.categoryTags || []}
        onTagsChange={handleTagsChange}
      />

      {/* Data Source Modal */}
      <DataSourceModal
        isOpen={isDataSourceModalOpen}
        onClose={() => setIsDataSourceModalOpen(false)}
        selectedSource={currentCourse.dataSource}
        onSourceSelect={handleDataSourceSelect}
      />
    </div>
  );
}
