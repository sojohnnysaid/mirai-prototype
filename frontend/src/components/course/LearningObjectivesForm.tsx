'use client';

import { useState } from 'react';
import { Plus, X, GripVertical, Target } from 'lucide-react';
import Button from '@/components/ui/Button';
import { LearningObjective } from '@/types';

interface LearningObjectivesFormProps {
  objectives: LearningObjective[];
  onChange: (objectives: LearningObjective[]) => void;
}

export default function LearningObjectivesForm({ objectives, onChange }: LearningObjectivesFormProps) {
  const [localObjectives, setLocalObjectives] = useState<LearningObjective[]>(
    objectives.length > 0 ? objectives : [{ id: '1', text: '' }]
  );

  const handleObjectiveChange = (id: string, text: string) => {
    const updated = localObjectives.map(obj =>
      obj.id === id ? { ...obj, text } : obj
    );
    setLocalObjectives(updated);
    onChange(updated);
  };

  const handleAddObjective = () => {
    const newObjective: LearningObjective = {
      id: Date.now().toString(),
      text: ''
    };
    const updated = [...localObjectives, newObjective];
    setLocalObjectives(updated);
    onChange(updated);
  };

  const handleRemoveObjective = (id: string) => {
    // Keep at least one objective
    if (localObjectives.length > 1) {
      const updated = localObjectives.filter(obj => obj.id !== id);
      setLocalObjectives(updated);
      onChange(updated);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Target className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">Learning Objectives</h3>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handleAddObjective}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Objective
        </Button>
      </div>

      {/* Instructions */}
      <p className="text-gray-600 mb-6">
        Define what learners will be able to do after completing this course. Each objective will create its own module in the course.
      </p>

      {/* Objectives List */}
      <div className="space-y-4">
        {localObjectives.map((objective, index) => (
          <div
            key={objective.id}
            className="group relative bg-white border border-gray-200 rounded-xl p-4 transition-all hover:border-gray-300"
          >
            <div className="flex items-start gap-3">
              {/* Drag Handle (visual only for now) */}
              <div className="mt-2 cursor-move opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="w-5 h-5 text-gray-400" />
              </div>

              {/* Objective Number */}
              <div className="flex-shrink-0 mt-2">
                <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-semibold text-sm">
                  {index + 1}
                </div>
              </div>

              {/* Text Field */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Learning Objective {index + 1}
                </label>
                <textarea
                  value={objective.text}
                  onChange={(e) => handleObjectiveChange(objective.id, e.target.value)}
                  placeholder="After completing this module, learners will be able to..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all resize-none"
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1">
                  This objective will become Module {index + 1} in the course
                </p>
              </div>

              {/* Remove Button */}
              {localObjectives.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveObjective(objective.id)}
                  className="mt-2 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  aria-label={`Remove objective ${index + 1}`}
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Helper Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-6">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 text-sm font-semibold">i</span>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">Writing Effective Learning Objectives</h4>
            <p className="text-sm text-gray-600 mb-2">
              Use action verbs like: analyze, create, evaluate, implement, design, or demonstrate.
            </p>
            <p className="text-sm text-gray-600">
              <strong>Example:</strong> "Analyze customer objections and apply appropriate response frameworks to address concerns effectively."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}