import { configureStore } from '@reduxjs/toolkit';
import courseReducer from './slices/courseSlice';
import uiReducer from './slices/uiSlice';
import aiGenerationReducer from './slices/aiGenerationSlice';

export const store = configureStore({
  reducer: {
    course: courseReducer,
    ui: uiReducer,
    aiGeneration: aiGenerationReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
