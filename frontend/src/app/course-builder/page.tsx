'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import {
  setCourseField,
  addPersona,
  updatePersona,
  removePersona,
  setLearningObjectives,
  setCurrentStep,
  resetCourse,
} from '@/store/slices/courseSlice';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Button from '@/components/ui/Button';
import CourseForm from '@/components/course/CourseForm';
import PersonaCard from '@/components/course/PersonaCard';
import ProgressIndicator from '@/components/ui/ProgressIndicator';
import { Info, ChevronLeft, ChevronRight } from 'lucide-react';

export default function CourseBuilder() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { sidebarOpen } = useSelector((state: RootState) => state.ui);
  const { currentCourse, currentStep } = useSelector((state: RootState) => state.course);

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

  const handleNext = () => {
    if (currentStep < 5) {
      dispatch(setCurrentStep(currentStep + 1));
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      dispatch(setCurrentStep(currentStep - 1));
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="bg-primary-200 rounded-2xl px-6 py-3 text-center">
              <p className="text-gray-900">
                Let's start by defining the objective of the course and key personas the course is catered to:
              </p>
            </div>

            <CourseForm />

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Course Perspectives{' '}
                  <span className="text-gray-500 font-normal italic">
                    (Add 1-4 personas who will guide the course creation process)
                  </span>
                </h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Defining your personas ensures the content is tailored and relevant to your desired audience and personas
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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

            <div className="flex justify-end">
              <Button onClick={handleNext}>next step</Button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="bg-primary-200 rounded-2xl px-6 py-3 text-center">
              <p className="text-gray-900">
                Now, we're going to further define the audience and key personas related to the course
              </p>
            </div>

            <button className="w-8 h-8 rounded-full bg-primary-200 flex items-center justify-center">
              <Info className="w-5 h-5 text-gray-700" />
            </button>

            <div className="bg-gray-100 rounded-2xl p-6">
              <div className="mb-6">
                <p className="text-gray-900 mb-2">After completing the course, the learning will be able to:</p>
                <p className="text-gray-400 mb-4">Draft Learning Objectives</p>
                <ul className="space-y-2 text-gray-900">
                  <li className="italic">Learning Objective 1:</li>
                  <li className="italic">Learning Objective 2:</li>
                  <li className="italic">Learning Objective 3:</li>
                  <li>AUTO-Generate</li>
                </ul>
              </div>
            </div>

            <div className="bg-gray-100 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Persona 1 <span className="ml-4">Primary Responsibilities:</span>
                </h3>
                <div className="flex gap-2">
                  <button className="w-10 h-10 rounded-full bg-primary-300 flex items-center justify-center">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button className="w-10 h-10 rounded-full bg-primary-300 flex items-center justify-center">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="space-y-2 text-gray-400">
                <p className="italic">Define the role and responsibilities of the role</p>
                <p className="italic">What challenges do they face in their role?</p>
                <p className="italic">What are their primary concerns?</p>
                <p className="italic">What knowledge should they already have?</p>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={handlePrevious}>
                Previous
              </Button>
              <Button onClick={handleNext}>Next</Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="bg-primary-200 rounded-2xl px-6 py-3 text-center">
              <p className="text-gray-900">Validate Inputs for course design</p>
            </div>

            <button className="w-8 h-8 rounded-full bg-primary-200 flex items-center justify-center">
              <Info className="w-5 h-5 text-gray-700" />
            </button>

            <div className="bg-gray-100 rounded-2xl p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Course Title</h3>
                <p className="text-gray-400 italic">eg: Objection Handling and Discovery Best Practices</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Desired Outcome</h3>
                <p className="text-gray-400 italic">Describe the specific goal for this course</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Destination Folder</h3>
                  <p className="text-gray-400 italic">Picklist from active folders</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Category Tags</h3>
                  <p className="text-gray-400 italic">Tagging content will help train the AI and organize content</p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Data Source dropdown [i]</h3>
                  <p className="text-gray-400 italic">Open Web, File upload, Integration</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Learning Objectives:</h3>
                <ul className="space-y-1">
                  <li>Learning Objective 1:</li>
                  <li>Learning Objective 2:</li>
                  <li>Learning Objective 3:</li>
                </ul>
              </div>
            </div>

            <div className="bg-gray-100 rounded-2xl p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Course Perspectives{' '}
                <span className="font-normal italic text-gray-500">
                  (Add 1-4 personas who will guide the course creation process)
                </span>
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Defining your personas ensures the content is tailored and relevant to your desired audience and personas
              </p>

              <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-gray-200 rounded-lg p-4">
                    <p className="font-semibold mb-2">Role:</p>
                    <p className="font-semibold mb-2">KPIs:</p>
                    <p className="font-semibold">Primary Responsibilities</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleNext}>Generate Course</Button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button className="w-8 h-8 rounded-full bg-primary-200 flex items-center justify-center">
                  <Info className="w-5 h-5 text-gray-700" />
                </button>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">Course Title</p>
                  <p className="text-sm text-gray-600">Desired Outcome</p>
                  <p className="text-sm text-gray-600">Learning Objective 1:</p>
                  <p className="text-sm text-gray-600">Learning Objective 2:</p>
                  <p className="text-sm text-gray-600">Learning Objective 3:</p>
                  <p className="text-sm text-gray-600">Roles:</p>
                </div>
              </div>
              <Button>Next</Button>
            </div>

            <div className="flex gap-6">
              <div className="w-64 bg-gray-100 rounded-2xl p-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Section 1: NAME</h3>
                    <div className="bg-primary-300 rounded-lg px-4 py-2 mb-2">
                      Lesson 1
                    </div>
                    <div className="bg-gray-200 rounded-lg px-4 py-2 mb-2">
                      Lesson 2
                    </div>
                    <div className="bg-gray-200 rounded-lg px-4 py-2">
                      Lesson 3
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Section 2: NAME</h3>
                    <div className="bg-gray-200 rounded-lg px-4 py-2 mb-2">
                      Lesson 1
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Section 3: NAME</h3>
                    <div className="bg-gray-200 rounded-lg px-4 py-2 mb-2">
                      Lesson 1
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 bg-gray-200 rounded-2xl min-h-[500px]">
                {/* Content preview area */}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        <Header />
        
        <div className="p-8">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold">PROMPT-BASED Starter Form Course Design</h1>
            <ProgressIndicator steps={5} currentStep={currentStep} />
          </div>

          {renderStepContent()}
        </div>
      </main>
    </div>
  );
}
