'use client';

import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { setCourseField } from '@/store/slices/courseSlice';
import Input from '@/components/ui/Input';

export default function CourseForm() {
  const dispatch = useDispatch();
  const { currentCourse } = useSelector((state: RootState) => state.course);

  const handleChange = (field: string, value: string) => {
    dispatch(setCourseField({ field, value }));
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
          <select
            value={currentCourse.destinationFolder || ''}
            onChange={(e) => handleChange('destinationFolder', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          >
            <option value="">Picklist from active folders</option>
            <option value="hr">Human Resources</option>
            <option value="product">Product Enablement</option>
            <option value="sales">Sales Enablement</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category Tags
          </label>
          <input
            type="text"
            placeholder="Tagging content will help train the AI"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data Source dropdown [i]
          </label>
          <select
            value={currentCourse.dataSource || ''}
            onChange={(e) => handleChange('dataSource', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          >
            <option value="">Open Web, File upload, Integration</option>
            <option value="open-web">Open Web</option>
            <option value="file-upload">File Upload</option>
            <option value="integration">Integration</option>
          </select>
        </div>
      </div>
    </div>
  );
}
