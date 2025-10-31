import { configureStore } from '@reduxjs/toolkit';
import courseReducer from './slices/courseSlice';
import uiReducer from './slices/uiSlice';
import aiGenerationReducer from './slices/aiGenerationSlice';
import { persistenceMiddleware, restoreFromLocalStorage } from './middleware/persistenceMiddleware';

// Only restore state on client-side
const getPreloadedState = () => {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const restoredState = restoreFromLocalStorage();
  if (!restoredState) {
    return undefined;
  }

  // Merge restored state with initial state to ensure all required fields exist
  const initialCourseState = {
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
    isLoading: false,
    isSaving: false,
    error: null,
  };

  return {
    course: {
      ...initialCourseState,
      ...restoredState,
      // Ensure currentCourse is properly merged
      currentCourse: {
        ...initialCourseState.currentCourse,
        ...restoredState.currentCourse,
      },
    }
  };
};

const preloadedState = getPreloadedState();

export const store = configureStore({
  reducer: {
    course: courseReducer,
    ui: uiReducer,
    aiGeneration: aiGenerationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['course/saveCourse/fulfilled', 'course/loadCourse/fulfilled'],
      },
    }).concat(persistenceMiddleware),
  preloadedState,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
