import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Classroom } from '@/types/classroom';
import api from '@/lib/api';

export interface ClassroomState {
  recentClassrooms: Classroom[];
  loadingRecent: boolean;
  recentError: string | null;
  timeRemainingSeconds: number | null;
  timeWarning: string | null;
}

const getInitialRecentClassrooms = (): Classroom[] => {
  try {
    const cached = localStorage.getItem('tdp_recent_classrooms');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
};

const initialState: ClassroomState = {
  recentClassrooms: getInitialRecentClassrooms(),
  loadingRecent: false,
  recentError: null,
  timeRemainingSeconds: null,
  timeWarning: null,
};

export const fetchRecentClassrooms = createAsyncThunk(
  'classroom/fetchRecentClassrooms',
  async (isStudent: boolean = false, { rejectWithValue }) => {
    try {
      let rooms: Classroom[] = [];

      try {
        const res = await api.get('/classrooms/recent');
        const raw = res.data?.classrooms || res.data?.data || res.data;
        if (Array.isArray(raw)) {
          rooms = raw.map((r: any) => ({
            id: r.id || r._id || r.classroomId,
            name: r.name,
            code: r.code,
            status: r.status,
            hostId: r.hostId || (typeof r.host === 'object' ? r.host?.id : r.host) || '',
            createdAt: r.createdAt,
            endedAt: r.endedAt,
          }));
        }
      } catch {
        const historyUrl = isStudent ? '/classrooms/history/student' : '/classrooms/history/teacher';
        const res = await api.get(historyUrl);
        const raw = res.data?.data || res.data;
        if (Array.isArray(raw)) {
          rooms = raw.map((r: any) => ({
            id: r.id || r._id || r.classroomId,
            name: r.name,
            code: r.code,
            status: r.status,
            hostId: r.hostId || (typeof r.host === 'object' ? r.host?.id : r.host) || '',
            createdAt: r.createdAt,
            endedAt: r.endedAt,
          }));
        }
      }

      if (rooms.length > 0) {
        localStorage.setItem('tdp_recent_classrooms', JSON.stringify(rooms));
      }
      return rooms;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to fetch classrooms');
    }
  },
);

export const classroomSlice = createSlice({
  name: 'classroom',
  initialState,
  reducers: {
    setRecentClassrooms: (state, action: PayloadAction<Classroom[]>) => {
      state.recentClassrooms = action.payload;
      localStorage.setItem('tdp_recent_classrooms', JSON.stringify(action.payload));
    },
    addRecentClassroom: (state, action: PayloadAction<Classroom>) => {
      const room = action.payload;
      const filtered = state.recentClassrooms.filter((r) => r.code !== room.code);
      state.recentClassrooms = [room, ...filtered].slice(0, 20);
      localStorage.setItem('tdp_recent_classrooms', JSON.stringify(state.recentClassrooms));
    },
    updateClassroomStatus: (
      state,
      action: PayloadAction<{ code: string; status: 'ACTIVE' | 'ENDED' }>,
    ) => {
      const { code, status } = action.payload;
      state.recentClassrooms = state.recentClassrooms.map((r) =>
        r.code === code ? { ...r, status } : r,
      );
      localStorage.setItem('tdp_recent_classrooms', JSON.stringify(state.recentClassrooms));
    },
    setTimeLimitInfo: (
      state,
      action: PayloadAction<{ remainingSeconds: number; warningMessage?: string }>,
    ) => {
      state.timeRemainingSeconds = action.payload.remainingSeconds;
      if (action.payload.warningMessage) {
        state.timeWarning = action.payload.warningMessage;
      }
    },
    decrementTimeRemaining: (state) => {
      if (state.timeRemainingSeconds !== null && state.timeRemainingSeconds > 0) {
        state.timeRemainingSeconds -= 1;
      }
    },
    clearTimeLimitInfo: (state) => {
      state.timeRemainingSeconds = null;
      state.timeWarning = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRecentClassrooms.pending, (state) => {
        state.loadingRecent = true;
        state.recentError = null;
      })
      .addCase(fetchRecentClassrooms.fulfilled, (state, action) => {
        state.loadingRecent = false;
        if (action.payload.length > 0) {
          state.recentClassrooms = action.payload;
        }
      })
      .addCase(fetchRecentClassrooms.rejected, (state, action) => {
        state.loadingRecent = false;
        state.recentError = action.payload as string;
      });
  },
});

export const classroomActions = classroomSlice.actions;
export default classroomSlice.reducer;
