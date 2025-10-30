'use client';

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import {
  addPersona,
  updatePersona,
  removePersona,
  setCurrentStep,
  setLearningObjectives,
} from '@/store/slices/courseSlice';
import Button from '@/components/ui/Button';
import CourseForm from '@/components/course/CourseForm';
import PersonaCard from '@/components/course/PersonaCard';
import LearningObjectivesForm from '@/components/course/LearningObjectivesForm';
import ProgressIndicator from '@/components/ui/ProgressIndicator';
import { Info } from 'lucide-react';

export default function CourseBuilder() {
  const dispatch = useDispatch();
  const { currentCourse, currentStep } = useSelector((state: RootState) => state.course);

  // ----------------------
  // Handlers
  // ----------------------
  const handleAddPersona = () => {
    const newPersona = {
      id: `persona-${Date.now()}`,
      name: `Persona ${(currentCourse.personas?.length || 0) + 1}`,
      role: '',
      kpis: '',
      responsibilities: '',
    };
    dispatch(addPersona(newPersona));
  };

  const handleUpdatePersona = (id: string, updates: any) => {
    dispatch(updatePersona({ id, persona: updates }));
  };

  const handleRemovePersona = (id: string) => {
    dispatch(removePersona(id));
  };

  const handleLearningObjectivesChange = (objectives: any[]) => {
    dispatch(setLearningObjectives(objectives));
  };

  const handleNext = () => {
    if (currentStep < 5) dispatch(setCurrentStep(currentStep + 1));
  };

  const handlePrevious = () => {
    if (currentStep > 1) dispatch(setCurrentStep(currentStep - 1));
  };

  // ----------------------
  // Step Renderer
  // ----------------------
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            {/* Course Form */}
            <div className="bg-white border border-gray-200 rounded-2xl p-8 mb-8">
              <CourseForm />
            </div>

            {/* Personas Section */}
            <div className="bg-white border border-gray-200 rounded-2xl p-8 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Target Personas/Roles{' '}
                  <span className="text-gray-500 font-normal italic">
                    (Add 1–4 personas who will take this course)
                  </span>
                </h3>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                Define the personas and roles who will be taking this course to ensure the content is tailored and relevant.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {currentCourse.personas?.map((persona) => (
                  <PersonaCard
                    key={persona.id}
                    persona={persona}
                    onUpdate={(updates) => handleUpdatePersona(persona.id, updates)}
                    onRemove={() => handleRemovePersona(persona.id)}
                  />
                ))}
              </div>

              {(!currentCourse.personas || currentCourse.personas.length < 4) && (
                <Button variant="outline" onClick={handleAddPersona}>
                  Add Persona
                </Button>
              )}
            </div>

            {/* Next Button */}
            <div className="flex justify-end">
              <Button onClick={handleNext}>Next Step</Button>
            </div>
          </>
        );

      case 2:
        return (
          <>
            {/* Step Banner */}
            <div className="bg-primary-50 rounded-2xl p-6 text-center mb-8">
              <p className="text-gray-900 font-medium">
                Define what learners will achieve after completing this course. Each objective will create its own module.
              </p>
            </div>

            {/* Learning Objectives Form */}
            <div className="bg-white border border-gray-200 rounded-2xl p-8 mb-8">
              <LearningObjectivesForm
                objectives={currentCourse.learningObjectives || []}
                onChange={handleLearningObjectivesChange}
              />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={handlePrevious}>
                Previous
              </Button>
              <Button onClick={handleNext}>Next</Button>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Define your learning goal</h1>
          <p className="text-gray-600">Your learning goals and the personas/roles who will take the courses generated</p>
        </div>
        <ProgressIndicator steps={5} currentStep={currentStep} />
      </div>

      {/* Content Area */}
      <div className="w-full">
        {renderStepContent()}
      </div>
    </>
  );
}
