import { useMemo, type FC } from 'react';
import { Provider } from 'react-redux';

import TaskBoard from '../components/TaskBoard';
import { createTasksStore, type RailsProps } from '../store/tasksStore';

// Auto-registered by React on Rails (config.auto_load_bundle +
// config.components_subdirectory = "ror_components").
// Rails server-renders this tree, then the client hydrates it with a
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
