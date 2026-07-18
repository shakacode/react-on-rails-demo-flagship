'use client';

import { useMemo, type FC } from 'react';
import { Provider } from 'react-redux';

import TaskBoard from './TaskBoard';
import { createTasksStore, type RailsProps } from '../store/tasksStore';

// Rendered as the client boundary within the auto-registered TasksApp server
// component. The Redux store starts from the same props Rails streamed.
const TasksApp: FC<RailsProps> = (props) => {
  const store = useMemo(() => createTasksStore(props), [props]);

  return (
    <Provider store={store}>
      <TaskBoard statuses={props.statuses} serverRenderedAt={props.serverRenderedAt} />
    </Provider>
  );
};

export default TasksApp;
