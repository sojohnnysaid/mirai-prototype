'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { updatePersona } from '@/store/slices/courseSlice';
import {
  startGeneration,
  updateProgress,
  completeGeneration
} from '@/store/slices/aiGenerationSlice';
import AIGenerateButton from '@/components/ai/AIGenerateButton';
import { aiGeneratedContent, mockGenerationDelays } from '@/lib/docOMaticMockData';
import { Persona } from '@/types';

export default function PersonaDetailForm() {
  const dispatch = useDispatch();
  const personas = useSelector(
    (state: RootState) => state.course.currentCourse.personas || []
  );
  const [currentPersonaIndex, setCurrentPersonaIndex] = useState(0);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);

  const currentPersona = personas[currentPersonaIndex];

  const handleFieldChange = (field: keyof Persona, value: string) => {
    if (currentPersona) {
      dispatch(updatePersona({
        id: currentPersona.id,
        persona: { [field]: value }
      }));
    }
  };

  const handleAutoGenerate = async () => {
    if (!currentPersona) return;

    setIsAutoGenerating(true);
    dispatch(startGeneration({ type: 'personas' }));

    // Simulate AI generation with progress updates
    const steps = [
      { progress: 25, message: `Analyzing ${currentPersona.role} role requirements...` },
      { progress: 50, message: 'Identifying key challenges and pain points...' },
      { progress: 75, message: 'Mapping required knowledge and skills...' },
      { progress: 100, message: 'Finalizing persona details...' },
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, mockGenerationDelays.personas / 4));
      dispatch(updateProgress(step));
    }

    // Get generated content based on role
    const generatedDetails = aiGeneratedContent.personaDetails[currentPersona.role as keyof typeof aiGeneratedContent.personaDetails] ||
      aiGeneratedContent.personaDetails['Sales Rep'];

    // Update persona with generated content
    dispatch(updatePersona({
      id: currentPersona.id,
      persona: {
        responsibilities: 'Prospecting, conducting demos, managing pipeline, closing deals, maintaining CRM records',
        challenges: generatedDetails.challenges,
        concerns: generatedDetails.concerns,
        knowledge: generatedDetails.knowledge,
      }
    }));

    dispatch(completeGeneration());
    setIsAutoGenerating(false);
  };

  const navigatePersona = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentPersonaIndex > 0) {
      setCurrentPersonaIndex(currentPersonaIndex - 1);
    } else if (direction === 'next' && currentPersonaIndex < personas.length - 1) {
      setCurrentPersonaIndex(currentPersonaIndex + 1);
    }
  };

  if (personas.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <p className="text-yellow-700">
          No personas defined. Please go back to Step 1 to add target personas.
        </p>
      </div>
    );
  }

  if (!currentPersona) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Persona Deep Dive</h3>
          <p className="text-sm text-gray-600 mt-1">
            Define detailed characteristics for each target persona
          </p>
        </div>
        <AIGenerateButton
          onClick={handleAutoGenerate}
          label="Auto-Fill Details"
          isGenerating={isAutoGenerating}
        />
      </div>

      {/* Persona Navigation */}
      <div className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-lg p-4">
        <button
          onClick={() => navigatePersona('prev')}
          disabled={currentPersonaIndex === 0}
          className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="text-center">
          <div className="text-sm text-purple-600 font-medium">
            Persona {currentPersonaIndex + 1} of {personas.length}
          </div>
          <div className="text-lg font-semibold text-gray-900 mt-1">
            {currentPersona.role}
          </div>
        </div>

        <button
          onClick={() => navigatePersona('next')}
          disabled={currentPersonaIndex === personas.length - 1}
          className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Persona Detail Fields */}
      <div className="space-y-4">
        {/* Primary Responsibilities */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Primary Responsibilities
          </label>
          <textarea
            value={currentPersona.responsibilities || ''}
            onChange={(e) => handleFieldChange('responsibilities', e.target.value)}
            placeholder="Define the key responsibilities and daily tasks for this role..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            rows={3}
          />
        </div>

        {/* Challenges */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What challenges do they face in their role?
          </label>
          <textarea
            value={currentPersona.challenges || ''}
            onChange={(e) => handleFieldChange('challenges', e.target.value)}
            placeholder="Describe the main obstacles and pain points they encounter..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            rows={3}
          />
        </div>

        {/* Primary Concerns */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What are their primary concerns?
          </label>
          <textarea
            value={currentPersona.concerns || ''}
            onChange={(e) => handleFieldChange('concerns', e.target.value)}
            placeholder="What keeps them up at night? What are they worried about?..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            rows={3}
          />
        </div>

        {/* Existing Knowledge */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What knowledge should they already have?
          </label>
          <textarea
            value={currentPersona.knowledge || ''}
            onChange={(e) => handleFieldChange('knowledge', e.target.value)}
            placeholder="Describe the baseline knowledge and skills they should possess..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            rows={3}
          />
        </div>
      </div>

      {/* Quick Navigation Dots */}
      <div className="flex justify-center gap-2 pt-4">
        {personas.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentPersonaIndex(index)}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentPersonaIndex
                ? 'bg-purple-600 w-8'
                : 'bg-gray-300 hover:bg-gray-400'
            }`}
            title={`Go to persona ${index + 1}`}
          />
        ))}
      </div>

      {/* Helper Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-700">
          <strong>💡 Tip:</strong> The more detailed your persona descriptions, the better the AI can tailor
          the course content to their specific needs and learning style.
        </p>
      </div>
    </div>
  );
}