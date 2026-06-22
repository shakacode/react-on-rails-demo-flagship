'use client';

import { useMemo, type FC } from 'react';
import { Provider } from 'react-redux';

import TaskBoard from '../components/TaskBoard';
import { createTasksStore, type RailsProps } from '../store/tasksStore';

// Auto-registered as the client half of the RSC pair. Rails streams the
// server component, then the browser hydrates this client component with a
// Redux Toolkit store seeded from the same props.
const TasksApp: FC<RailsProps> = (props) => {
  const store = useMemo(() => createTasksStore(props), [props]);

  return (
    <Provider store={store}>
      <TaskBoard statuses={props.statuses} serverRenderedAt={props.serverRenderedAt} />
    </Provider>
  );
};

export default TasksApp;
