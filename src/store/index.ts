import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import classroomReducer from './slices/classroomSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    classroom: classroomReducer,
  },
  devTools: true,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
