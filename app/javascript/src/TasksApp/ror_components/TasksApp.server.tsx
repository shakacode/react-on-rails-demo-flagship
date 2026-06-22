import TasksApp from './TasksApp.client';
import type { RailsProps } from '../store/tasksStore';

export default function TasksAppServer(props: RailsProps) {
  return <TasksApp {...props} />;
}
