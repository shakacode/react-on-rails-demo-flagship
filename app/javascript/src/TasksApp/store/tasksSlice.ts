import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import ReactOnRails from 'react-on-rails';

export type TaskStatus = 'todo' | 'doing' | 'done';

export interface Task {
  id: number;
  title: string;
  notes: string | null;
  status: TaskStatus;
  position: number;
  updatedAt: string;
}

export interface TasksState {
  items: Task[];
  saving: boolean;
  error: string | null;
}

const initialState: TasksState = {
  items: [],
  saving: false,
  error: null,
};

interface ErrorPayload {
  errors?: string[];
}

// Rails CSRF token (and friends) via React on Rails, filtered to plain
// string values so the result satisfies HeadersInit.
function csrfHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  Object.entries(ReactOnRails.authenticityHeaders({})).forEach(([key, value]) => {
    if (typeof value === 'string') {
      headers[key] = value;
    }
  });
  return headers;
}

// Small fetch wrapper: JSON in/out, Rails CSRF token via React on Rails,
// and server validation errors surfaced as thrown messages so the slice's
// rejected reducers can show them in the error banner.
async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...csrfHeaders(),
        ...options.headers,
      },
    });
  } catch {
    throw new Error('Network error: is the Rails server still running?');
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as ErrorPayload;
      if (body.errors && body.errors.length > 0) {
        message = body.errors.join(', ');
      }
    } catch {
      // Non-JSON error body; keep the status message.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const createTask = createAsyncThunk<Task, { title: string; notes: string }>(
  'tasks/create',
  async (attrs) => {
    const data = await request<{ task: Task }>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ task: attrs }),
    });
    return data.task;
  },
);

export const updateTask = createAsyncThunk<Task, { id: number; changes: Partial<Pick<Task, 'title' | 'notes' | 'status'>> }>(
  'tasks/update',
  async ({ id, changes }) => {
    const data = await request<{ task: Task }>(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ task: changes }),
    });
    return data.task;
  },
);

export const deleteTask = createAsyncThunk<number, number>('tasks/delete', async (id) => {
  await request<void>(`/api/tasks/${id}`, { method: 'DELETE' });
  return id;
});

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createTask.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(updateTask.fulfilled, (state, action) => {
        const index = state.items.findIndex((task) => task.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.items = state.items.filter((task) => task.id !== action.payload);
      })
      .addMatcher(
        (action) => action.type.startsWith('tasks/') && action.type.endsWith('/pending'),
        (state) => {
          state.saving = true;
          state.error = null;
        },
      )
      .addMatcher(
        (action) => action.type.startsWith('tasks/') && action.type.endsWith('/fulfilled'),
        (state) => {
          state.saving = false;
        },
      )
      .addMatcher(
        (action): action is { type: string; error: { message?: string } } =>
          action.type.startsWith('tasks/') && action.type.endsWith('/rejected'),
        (state, action) => {
          state.saving = false;
          state.error = action.error.message ?? 'Something went wrong';
        },
      );
  },
});

export const { clearError } = tasksSlice.actions;

export default tasksSlice.reducer;
