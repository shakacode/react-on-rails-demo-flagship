import TasksApp from './TasksApp.client';

// Same component on the server: the Redux store is created from the Rails
// props during SSR, so the server HTML matches the hydrated client exactly.
export default TasksApp;
