import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Course, Persona, LearningObjective, CourseBlock, CourseSection, CourseAssessmentSettings } from '@/types';

interface CourseState {
  currentCourse: Partial<Course>;
  courses: Course[];
  currentStep: number;
  isGenerating: boolean;
  generatedContent: any;
  courseBlocks: CourseBlock[];
  activeBlockId: string | null;
}

const initialState: CourseState = {
  currentCourse: {
    personas: [],
    learningObjectives: [],
    sections: [],
    assessmentSettings: {
      enableEmbeddedKnowledgeChecks: true,
      enableFinalExam: true,
    },
  },
  courses: [],
  currentStep: 1,
  isGenerating: false,
  generatedContent: null,
  courseBlocks: [],
  activeBlockId: null,
};

const courseSlice = createSlice({
  name: 'course',
  initialState,
  reducers: {
    setCourseField: (state, action: PayloadAction<{ field: string; value: any }>) => {
      const { field, value } = action.payload;
      (state.currentCourse as any)[field] = value;
    },
    addPersona: (state, action: PayloadAction<Persona>) => {
      if (!state.currentCourse.personas) {
        state.currentCourse.personas = [];
      }
      state.currentCourse.personas.push(action.payload);
    },
    updatePersona: (state, action: PayloadAction<{ id: string; persona: Partial<Persona> }>) => {
      const { id, persona } = action.payload;
      const index = state.currentCourse.personas?.findIndex(p => p.id === id);
      if (index !== undefined && index !== -1 && state.currentCourse.personas) {
        state.currentCourse.personas[index] = {
          ...state.currentCourse.personas[index],
          ...persona,
        };
      }
    },
    removePersona: (state, action: PayloadAction<string>) => {
      if (state.currentCourse.personas) {
        state.currentCourse.personas = state.currentCourse.personas.filter(
          p => p.id !== action.payload
        );
      }
    },
    setLearningObjectives: (state, action: PayloadAction<LearningObjective[]>) => {
      state.currentCourse.learningObjectives = action.payload;
    },
    setAssessmentSettings: (state, action: PayloadAction<Partial<CourseAssessmentSettings>>) => {
      if (!state.currentCourse.assessmentSettings) {
        state.currentCourse.assessmentSettings = {
          enableEmbeddedKnowledgeChecks: true,
          enableFinalExam: true,
        };
      }
      state.currentCourse.assessmentSettings = {
        ...state.currentCourse.assessmentSettings,
        ...action.payload,
      };
    },
    setCurrentStep: (state, action: PayloadAction<number>) => {
      state.currentStep = action.payload;
    },
    resetCourse: (state) => {
      state.currentCourse = {
        personas: [],
        learningObjectives: [],
        sections: [],
        assessmentSettings: {
          enableEmbeddedKnowledgeChecks: true,
          enableFinalExam: true,
        },
      };
      state.currentStep = 1;
    },
    addCourse: (state, action: PayloadAction<Course>) => {
      state.courses.push(action.payload);
    },
    // New block management actions
    addCourseBlock: (state, action: PayloadAction<CourseBlock>) => {
      state.courseBlocks.push(action.payload);
    },
    updateCourseBlock: (state, action: PayloadAction<{ id: string; block: Partial<CourseBlock> }>) => {
      const { id, block } = action.payload;
      const index = state.courseBlocks.findIndex(b => b.id === id);
      if (index !== -1) {
        state.courseBlocks[index] = {
          ...state.courseBlocks[index],
          ...block,
        };
      }
    },
    removeCourseBlock: (state, action: PayloadAction<string>) => {
      state.courseBlocks = state.courseBlocks.filter(b => b.id !== action.payload);
    },
    reorderCourseBlocks: (state, action: PayloadAction<{ fromIndex: number; toIndex: number }>) => {
      const { fromIndex, toIndex } = action.payload;
      const [removed] = state.courseBlocks.splice(fromIndex, 1);
      state.courseBlocks.splice(toIndex, 0, removed);
      // Update order property
      state.courseBlocks.forEach((block, index) => {
        block.order = index;
      });
    },
    setActiveBlockId: (state, action: PayloadAction<string | null>) => {
      state.activeBlockId = action.payload;
    },
    // AI generation actions
    setIsGenerating: (state, action: PayloadAction<boolean>) => {
      state.isGenerating = action.payload;
    },
    setGeneratedContent: (state, action: PayloadAction<any>) => {
      state.generatedContent = action.payload;
    },
    generateCourseSections: (state) => {
      // This will be handled by a thunk or saga, but we set the generating flag
      state.isGenerating = true;
    },
  },
});

export const {
  setCourseField,
  addPersona,
  updatePersona,
  removePersona,
  setLearningObjectives,
  setAssessmentSettings,
  setCurrentStep,
  resetCourse,
  addCourse,
  addCourseBlock,
  updateCourseBlock,
  removeCourseBlock,
  reorderCourseBlocks,
  setActiveBlockId,
  setIsGenerating,
  setGeneratedContent,
  generateCourseSections,
} = courseSlice.actions;

export default courseSlice.reducer;
