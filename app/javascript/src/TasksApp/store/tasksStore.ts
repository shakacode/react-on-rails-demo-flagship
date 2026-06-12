import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';

import tasksReducer, { type Task, type TaskStatus } from './tasksSlice';

// Props passed from Rails: see TasksController#index and
// app/views/tasks/index.html.erb. The same props server-render the
// component and seed the client store, so hydration matches exactly.
export interface RailsProps {
  tasks: Task[];
  statuses: TaskStatus[];
  serverRenderedAt: string;
}

export const createTasksStore = (props: RailsProps) =>
  configureStore({
    reducer: {
      tasks: tasksReducer,
    },
    preloadedState: {
      tasks: {
        items: props.tasks,
        saving: false,
        error: null,
      },
    },
  });

export type TasksStore = ReturnType<typeof createTasksStore>;
export type RootState = ReturnType<TasksStore['getState']>;
export type AppDispatch = TasksStore['dispatch'];

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
