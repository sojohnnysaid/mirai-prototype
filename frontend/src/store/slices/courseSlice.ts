import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Course, Persona, LearningObjective } from '@/types';

interface CourseState {
  currentCourse: Partial<Course>;
  courses: Course[];
  currentStep: number;
}

const initialState: CourseState = {
  currentCourse: {
    personas: [],
    learningObjectives: [],
    sections: [],
  },
  courses: [],
  currentStep: 1,
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
    setCurrentStep: (state, action: PayloadAction<number>) => {
      state.currentStep = action.payload;
    },
    resetCourse: (state) => {
      state.currentCourse = {
        personas: [],
        learningObjectives: [],
        sections: [],
      };
      state.currentStep = 1;
    },
    addCourse: (state, action: PayloadAction<Course>) => {
      state.courses.push(action.payload);
    },
  },
});

export const {
  setCourseField,
  addPersona,
  updatePersona,
  removePersona,
  setLearningObjectives,
  setCurrentStep,
  resetCourse,
  addCourse,
} = courseSlice.actions;

export default courseSlice.reducer;
